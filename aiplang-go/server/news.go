// aiplang — lightweight multilingual news module
//
// Serves a small file-backed news feed so the Oplena aggregator can consume
// aiplang like the other products. Data lives in a plain JSON file (embedded
// as default, with an optional runtime override at ./data/news.json or the
// path given by NEWS_JSON). No database required.
//
// Public endpoints (language fallback is always PT):
//   GET /news?lang=pt&page=1   → published news, PT fallback, newest first
//   GET /news/:slug?lang=pt    → single published article
//   GET /news/feed?lang=pt     → lean feed for aggregators
//   GET /noticias              → simple public HTML listing (PT)

package aiplangserver

import (
	_ "embed"
	"encoding/json"
	"html"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
)

//go:embed data/news.json
var embeddedNews []byte

const newsProject = "aiplang"
const defaultLang = "pt"
const newsPageSize = 10

// ── Storage model ──────────────────────────────────────────────────

type NewsTranslation struct {
	Title   string `json:"title"`
	Slug    string `json:"slug"`
	Excerpt string `json:"excerpt"`
	Body    string `json:"body"`
}

type NewsItem struct {
	ID           string                     `json:"id"`
	Slug         string                     `json:"slug"`
	CoverURL     string                     `json:"coverUrl"`
	Status       string                     `json:"status"`
	PublishedAt  string                     `json:"publishedAt"`
	Translations map[string]NewsTranslation `json:"translations"`
}

// loadNews reads the news store. It prefers a runtime file (so content can be
// edited without recompiling) and falls back to the embedded sample.
func loadNews() []NewsItem {
	raw := embeddedNews
	path := resolveEnv("NEWS_JSON", "./data/news.json")
	if b, err := os.ReadFile(path); err == nil && len(b) > 0 {
		raw = b
	}
	var items []NewsItem
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil
	}
	return items
}

// ── View models ────────────────────────────────────────────────────

type newsView struct {
	ID          string   `json:"id"`
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Excerpt     string   `json:"excerpt"`
	Body        string   `json:"body,omitempty"`
	CoverURL    string   `json:"coverUrl"`
	PublishedAt string   `json:"publishedAt"`
	Lang        string   `json:"lang"`
	Langs       []string `json:"langs"`
}

type feedItem struct {
	Project     string   `json:"project"`
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Excerpt     string   `json:"excerpt"`
	CoverURL    string   `json:"coverUrl"`
	PublishedAt string   `json:"publishedAt"`
	Slug        string   `json:"slug"`
	Langs       []string `json:"langs"`
}

// langsOf lists the language codes with a non-empty translation.
func (n NewsItem) langsOf() []string {
	order := []string{"pt", "en", "es"}
	var out []string
	for _, l := range order {
		if t, ok := n.Translations[l]; ok && t.Title != "" {
			out = append(out, l)
		}
	}
	// include any extra languages not in the preferred order
	for l, t := range n.Translations {
		if t.Title == "" {
			continue
		}
		found := false
		for _, o := range out {
			if o == l {
				found = true
				break
			}
		}
		if !found {
			out = append(out, l)
		}
	}
	return out
}

// pick returns the translation for lang, always falling back to PT.
func (n NewsItem) pick(lang string) NewsTranslation {
	if t, ok := n.Translations[lang]; ok && t.Title != "" {
		return t
	}
	return n.Translations[defaultLang]
}

func (n NewsItem) toView(lang string, withBody bool) newsView {
	t := n.pick(lang)
	v := newsView{
		ID:          n.ID,
		Slug:        n.Slug,
		Title:       t.Title,
		Excerpt:     t.Excerpt,
		CoverURL:    n.CoverURL,
		PublishedAt: n.PublishedAt,
		Lang:        lang,
		Langs:       n.langsOf(),
	}
	if withBody {
		v.Body = t.Body
	}
	return v
}

// publishedSorted returns published items, newest first (PublishedAt desc).
func publishedSorted() []NewsItem {
	all := loadNews()
	out := all[:0:0]
	for _, n := range all {
		if strings.EqualFold(n.Status, "published") {
			out = append(out, n)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].PublishedAt > out[j].PublishedAt
	})
	return out
}

func langParam(r *http.Request) string {
	lang := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("lang")))
	if lang == "" {
		return defaultLang
	}
	return lang
}

// ── HTTP handlers ──────────────────────────────────────────────────

// registerNewsRoutes wires the public news endpoints. The feed route is
// matched before the generic :slug route.
func (s *Server) registerNewsRoutes() {
	s.mux.HandleFunc("/news", s.handleNewsList)
	s.mux.HandleFunc("/news/", s.handleNewsSub) // /news/feed and /news/:slug
	s.mux.HandleFunc("/noticias", s.handleNewsPage)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// GET /news?lang=pt&page=1
func (s *Server) handleNewsList(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/news" {
		http.NotFound(w, r)
		return
	}
	lang := langParam(r)
	page := 1
	if p, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && p > 0 {
		page = p
	}

	items := publishedSorted()
	total := len(items)
	start := (page - 1) * newsPageSize
	if start > total {
		start = total
	}
	end := start + newsPageSize
	if end > total {
		end = total
	}

	views := make([]newsView, 0, end-start)
	for _, n := range items[start:end] {
		views = append(views, n.toView(lang, false))
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"lang":     lang,
		"page":     page,
		"pageSize": newsPageSize,
		"total":    total,
		"items":    views,
	})
}

// /news/feed and /news/:slug
func (s *Server) handleNewsSub(w http.ResponseWriter, r *http.Request) {
	rest := strings.Trim(strings.TrimPrefix(r.URL.Path, "/news/"), "/")

	// feed route registered before :slug
	if rest == "feed" {
		s.handleNewsFeed(w, r)
		return
	}
	if rest == "" {
		s.handleNewsList(w, r)
		return
	}
	s.handleNewsSingle(w, r, rest)
}

// GET /news/feed?lang=pt
func (s *Server) handleNewsFeed(w http.ResponseWriter, r *http.Request) {
	lang := langParam(r)
	items := publishedSorted()
	feed := make([]feedItem, 0, len(items))
	for _, n := range items {
		t := n.pick(lang)
		feed = append(feed, feedItem{
			Project:     newsProject,
			ID:          n.ID,
			Title:       t.Title,
			Excerpt:     t.Excerpt,
			CoverURL:    n.CoverURL,
			PublishedAt: n.PublishedAt,
			Slug:        n.Slug,
			Langs:       n.langsOf(),
		})
	}
	writeJSON(w, http.StatusOK, feed)
}

// GET /news/:slug?lang=pt
func (s *Server) handleNewsSingle(w http.ResponseWriter, r *http.Request, slug string) {
	lang := langParam(r)
	for _, n := range publishedSorted() {
		if n.matchesSlug(slug) {
			writeJSON(w, http.StatusOK, n.toView(lang, true))
			return
		}
	}
	writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
}

// matchesSlug accepts the canonical slug or any per-language translated slug.
func (n NewsItem) matchesSlug(slug string) bool {
	if n.Slug == slug {
		return true
	}
	for _, t := range n.Translations {
		if t.Slug == slug {
			return true
		}
	}
	return false
}

// GET /noticias — simple public HTML listing (PT), for the product site.
func (s *Server) handleNewsPage(w http.ResponseWriter, r *http.Request) {
	items := publishedSorted()
	var b strings.Builder
	b.WriteString(`<!doctype html><html lang="pt"><head><meta charset="utf-8">`)
	b.WriteString(`<meta name="viewport" content="width=device-width, initial-scale=1">`)
	b.WriteString(`<title>Noticias — aiplang</title>`)
	b.WriteString(`<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.5;color:#111}h1{font-size:1.6rem}article{padding:16px 0;border-bottom:1px solid #eee}article h2{font-size:1.15rem;margin:0 0 4px}time{color:#888;font-size:.85rem}a{color:#2b6cb0;text-decoration:none}</style>`)
	b.WriteString(`</head><body><h1>Noticias aiplang</h1>`)
	if len(items) == 0 {
		b.WriteString(`<p>Nenhuma noticia publicada.</p>`)
	}
	for _, n := range items {
		t := n.pick(defaultLang)
		b.WriteString(`<article><h2><a href="/news/`)
		b.WriteString(html.EscapeString(n.Slug))
		b.WriteString(`?lang=pt">`)
		b.WriteString(html.EscapeString(t.Title))
		b.WriteString(`</a></h2><time>`)
		b.WriteString(html.EscapeString(n.PublishedAt))
		b.WriteString(`</time><p>`)
		b.WriteString(html.EscapeString(t.Excerpt))
		b.WriteString(`</p></article>`)
	}
	b.WriteString(`</body></html>`)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(b.String()))
}
