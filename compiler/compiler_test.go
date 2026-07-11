package fluxcompiler

import (
	"strings"
	"testing"
)

func TestParseFlux_PageHeader(t *testing.T) {
	src := `%home dark /`
	pages := ParseFlux(src)
	if len(pages) != 1 {
		t.Fatalf("esperava 1 page, veio %d", len(pages))
	}
	p := pages[0]
	if p.ID != "home" || p.Theme != "dark" || p.Route != "/" {
		t.Errorf("page header errado: %+v", p)
	}
}

func TestParseFlux_VariosPagesSeparadosPorTresHifens(t *testing.T) {
	src := strings.Join([]string{
		`%a dark /a`,
		`---`,
		`%b light /b`,
	}, "\n")
	pages := ParseFlux(src)
	if len(pages) != 2 {
		t.Fatalf("esperava 2, veio %d", len(pages))
	}
	if pages[0].ID != "a" || pages[1].ID != "b" {
		t.Errorf("ids errados: %s, %s", pages[0].ID, pages[1].ID)
	}
}

func TestParseFlux_StateBindings(t *testing.T) {
	src := `%p dark /
@count=0
@title=hello`
	pages := ParseFlux(src)
	if len(pages) != 1 {
		t.Fatalf("page count")
	}
	st := pages[0].State
	if st["count"] != "0" || st["title"] != "hello" {
		t.Errorf("state: %+v", st)
	}
}

func TestParseFlux_IgnoraComentariosELinhasVazias(t *testing.T) {
	src := `# comentário
%home dark /

# outro
@x=1`
	pages := ParseFlux(src)
	if len(pages) != 1 || pages[0].State["x"] != "1" {
		t.Fatalf("comentários quebraram parse: %+v", pages)
	}
}

func TestParseFlux_DefaultsQuandoSoTemHeaderMinimo(t *testing.T) {
	pages := ParseFlux(`%`)
	// Header `%` sem campos: defaults id=page theme=dark route=/.
	if len(pages) != 1 {
		t.Fatalf("page count")
	}
	p := pages[0]
	if p.ID != "page" || p.Theme != "dark" || p.Route != "/" {
		t.Errorf("defaults errados: %+v", p)
	}
}

func TestCompileSSG_GeraUmEntryPorPagina(t *testing.T) {
	pages := []Page{
		{ID: "home", Theme: "dark", Route: "/"},
		{ID: "about", Theme: "light", Route: "/about"},
	}
	out := CompileSSG(pages, "/assets")
	if len(out) == 0 {
		t.Fatalf("CompileSSG retornou map vazio")
	}
	// Cada page deve aparecer no map de algum jeito (chave costuma ser path da rota).
	found := 0
	for k, v := range out {
		if !strings.HasPrefix(v, "<") {
			t.Errorf("output não parece HTML: %q -> %q", k, v[:min(50, len(v))])
		}
		if strings.Contains(k, "index.html") || strings.Contains(k, "about") || strings.Contains(k, "home") {
			found++
		}
	}
	if found < 2 {
		t.Errorf("esperava 2 entries (root + /about), achei %d em %d total — keys=%v", found, len(out), keys(out))
	}
}

func min(a, b int) int { if a < b { return a }; return b }
func keys(m map[string]string) []string {
	out := make([]string, 0, len(m))
	for k := range m { out = append(out, k) }
	return out
}
