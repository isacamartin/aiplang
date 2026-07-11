package aiplangserver

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// sampleNews wires NEWS_JSON to a controlled fixture so the tests do not depend
// on the embedded default or the repo's data/news.json.
func sampleNews(t *testing.T) {
	t.Helper()
	const data = `[
      {"id":"a","slug":"alpha","status":"published","publishedAt":"2026-01-01T00:00:00Z",
       "translations":{"pt":{"title":"Alpha PT","slug":"alpha","excerpt":"ex a","body":"body a"}}},
      {"id":"b","slug":"beta","status":"published","publishedAt":"2026-02-01T00:00:00Z",
       "translations":{"pt":{"title":"Beta PT","slug":"beta","excerpt":"ex b","body":"body b"},
                       "en":{"title":"Beta EN","slug":"beta-en","excerpt":"ex b en","body":"body b en"}}},
      {"id":"c","slug":"rascunho","status":"draft","publishedAt":"2026-03-01T00:00:00Z",
       "translations":{"pt":{"title":"Draft","slug":"rascunho","excerpt":"x","body":"y"}}}
    ]`
	path := filepath.Join(t.TempDir(), "news.json")
	if err := os.WriteFile(path, []byte(data), 0o644); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	t.Setenv("NEWS_JSON", path)
}

func TestPublishedSorted_ExcludesDraftsNewestFirst(t *testing.T) {
	sampleNews(t)
	got := publishedSorted()
	if len(got) != 2 {
		t.Fatalf("expected 2 published items, got %d", len(got))
	}
	if got[0].ID != "b" || got[1].ID != "a" {
		t.Errorf("expected newest-first [b a], got [%s %s]", got[0].ID, got[1].ID)
	}
}

func TestPick_FallsBackToPT(t *testing.T) {
	sampleNews(t)
	items := publishedSorted()
	var alpha NewsItem
	for _, n := range items {
		if n.ID == "a" {
			alpha = n
		}
	}
	if tr := alpha.pick("en"); tr.Title != "Alpha PT" {
		t.Errorf("missing translation should fall back to PT, got %q", tr.Title)
	}
}

func TestLangParam_DefaultsToPT(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/news", nil)
	if got := langParam(r); got != "pt" {
		t.Errorf("expected default lang pt, got %q", got)
	}
	r = httptest.NewRequest(http.MethodGet, "/news?lang=EN", nil)
	if got := langParam(r); got != "en" {
		t.Errorf("expected normalized lang en, got %q", got)
	}
}

func TestHandleNewsList_ReturnsPublishedJSON(t *testing.T) {
	sampleNews(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/news?lang=pt", nil)
	(&Server{}).handleNewsList(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body struct {
		Total int `json:"total"`
		Items []struct {
			ID    string `json:"id"`
			Title string `json:"title"`
			Body  string `json:"body"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Total != 2 || len(body.Items) != 2 {
		t.Fatalf("expected 2 items, got total=%d len=%d", body.Total, len(body.Items))
	}
	if body.Items[0].ID != "b" {
		t.Errorf("expected newest item first, got %q", body.Items[0].ID)
	}
	if body.Items[0].Body != "" {
		t.Errorf("list view must not include body, got %q", body.Items[0].Body)
	}
}

func TestHandleNewsSingle_MatchesCanonicalAndTranslatedSlug(t *testing.T) {
	sampleNews(t)
	for _, slug := range []string{"beta", "beta-en"} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/news/"+slug, nil)
		(&Server{}).handleNewsSub(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("slug %q: status = %d, want 200", slug, rec.Code)
		}
		var v newsView
		if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
			t.Fatalf("slug %q: decode: %v", slug, err)
		}
		if v.ID != "b" || v.Body == "" {
			t.Errorf("slug %q: expected item b with body, got id=%q body=%q", slug, v.ID, v.Body)
		}
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/news/does-not-exist", nil)
	(&Server{}).handleNewsSub(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Errorf("unknown slug: status = %d, want 404", rec.Code)
	}
}

func TestHandleNewsFeed_TagsProject(t *testing.T) {
	sampleNews(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/news/feed", nil)
	(&Server{}).handleNewsSub(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var feed []feedItem
	if err := json.Unmarshal(rec.Body.Bytes(), &feed); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(feed) != 2 {
		t.Fatalf("expected 2 feed items, got %d", len(feed))
	}
	if feed[0].Project != newsProject {
		t.Errorf("feed item missing project tag, got %q", feed[0].Project)
	}
}
