#!/usr/bin/env python3
"""GG Learning Labs — browser QA across every route and viewport."""
import os, sys, time, http.server, socketserver, threading, functools, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("GGL_CHROME", "")
PORT = 8799
BASE = f"http://127.0.0.1:{PORT}"

ROUTES = [("/index.html","Homepage"),("/login.html","Login"),("/forgot-password.html","Forgot password"),
    ("/app/dashboard.html","Dashboard"),("/app/users.html","Users"),("/app/courses.html","Courses"),
    ("/app/batches.html","Batches"),("/app/calendar.html","Calendar"),("/app/attendance.html","Attendance"),
    ("/app/trainers.html","Trainers"),("/app/content.html","Content"),
    ("/app/effectiveness.html","Effectiveness"),("/app/observation.html","Observation"),
    ("/app/effectiveness-calculator.html","Calculator"),("/app/assessments.html","Assessments"),
    ("/app/certificates.html","Certificates"),("/app/gamification.html","Gamification"),
    ("/app/reports.html","Reports"),("/app/learning.html","My Learning"),
    ("/app/notifications.html","Notifications"),("/app/settings.html","Settings"),
    ("/app/newsfeed.html","Newsfeed"),("/app/tna.html","TNA"),("/app/competencies.html","Competencies"),
    ("/app/sops.html","SOPs"),("/app/coaching.html","Coaching"),("/app/mentoring.html","Mentoring"),
    ("/app/requests.html","Requests"),("/app/paths.html","Paths"),("/app/audit.html","Audit"),
    ("/app/platform.html","Platform")]
VIEWPORTS = [("desktop",1440,900),("tablet",768,1024),("mobile",390,844)]
res = {"p":0,"f":0}; fails=[]
def ok(l): res["p"]+=1; print(f"  \033[32m+\033[0m {l}")
def bad(l,d=""): res["f"]+=1; fails.append(f"{l} — {d}"); print(f"  \033[31mx\033[0m {l}" + (f" — {d}" if d else ""))

def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    socketserver.TCPServer.allow_reuse_address = True
    s = socketserver.TCPServer(("127.0.0.1",PORT), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s

def sign_in(page, email="superadmin@example.com"):
    page.goto(f"{BASE}/index.html", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('ggl.session')")
    page.goto(f"{BASE}/login.html", wait_until="networkidle")
    page.wait_for_selector("#email", timeout=15000)
    page.fill("#email", email); page.fill("#password","demo1234")
    page.click("button[type=submit]")
    page.wait_for_url("**/app/dashboard.html", timeout=15000)
    page.wait_for_load_state("networkidle")

def overflow(page):
    return page.evaluate("""() => {
        const de=document.documentElement;
        if (de.scrollWidth - de.clientWidth <= 1) return [];
        const w=de.clientWidth, bad=[];
        document.querySelectorAll('body *').forEach(el=>{
            const r=el.getBoundingClientRect();
            if(r.width===0) return;
            if(r.right<=w+1 && r.left>=-1) return;
            let p=el, skip=false;
            while(p && p!==document.body){
                const cs=getComputedStyle(p);
                if(['auto','scroll','hidden'].includes(cs.overflowX)){skip=true;break;}
                if(cs.position==='fixed'){skip=true;break;}
                p=p.parentElement;
            }
            if(skip) return;
            bad.push(el.tagName + (typeof el.className==='string'&&el.className?'.'+el.className.split(' ')[0]:''));
        });
        return [...new Set(bad)].slice(0,4);
    }""")

def main():
    httpd = serve(); time.sleep(0.4)
    launch = {"executable_path":CHROME} if CHROME else {}
    with sync_playwright() as pw:
        b = pw.chromium.launch(**launch)
        ctx = b.new_context(viewport={"width":1440,"height":900})
        page = ctx.new_page(); errs=[]
        page.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))

        print("\n\033[1mRoute loading\033[0m\n")
        sign_in(page); ok("sign in as superadmin")
        for route,name in ROUTES:
            errs.clear()
            page.goto(f"{BASE}{route}", wait_until="networkidle"); page.wait_for_timeout(900)
            bad(f"{name} loads clean","; ".join(errs[:2])) if errs else ok(f"{name} loads clean")

        print("\n\033[1mTheme toggle (the reported bug)\033[0m\n")
        page.goto(f"{BASE}/app/dashboard.html", wait_until="networkidle"); page.wait_for_timeout(800)
        box = page.evaluate("""() => {
            const b=document.querySelector('[data-theme-toggle]'); const s=b.querySelector('svg');
            const br=b.getBoundingClientRect(), sr=s.getBoundingClientRect();
            return {dx:(sr.left+sr.width/2)-(br.left+br.width/2), dy:(sr.top+sr.height/2)-(br.top+br.height/2)};
        }""")
        if abs(box["dx"])<1.5 and abs(box["dy"])<1.5:
            ok(f"theme toggle glyph is centred (offset {box['dx']:.1f},{box['dy']:.1f}px)")
        else:
            bad("theme toggle centred", f"offset {box['dx']:.1f},{box['dy']:.1f}px")
        t0=page.get_attribute("html","data-theme"); page.click("[data-theme-toggle]"); page.wait_for_timeout(400)
        t1=page.get_attribute("html","data-theme")
        ok(f"theme toggles ({t0} → {t1})") if t0!=t1 else bad("theme toggles")
        page.click("[data-theme-toggle]"); page.wait_for_timeout(300)

        print("\n\033[1mNavigation & menus\033[0m\n")
        soon = page.eval_on_selector_all(".nav-item.is-soon","e=>e.length")
        ok("no 'coming soon' placeholders") if soon==0 else bad("placeholders remain",str(soon))
        page.click(".topbar-actions [data-dropdown-trigger]"); page.wait_for_timeout(350)
        if page.eval_on_selector(".topbar-actions .menu","e=>e.classList.contains('open')"):
            ok("account menu opens and stays open")
        else: bad("account menu","closed itself")
        page.keyboard.press("Escape"); page.wait_for_timeout(250)
        page.click(".sidebar-user"); page.wait_for_timeout(350)
        if page.eval_on_selector(".sidebar-foot .menu","e=>e.classList.contains('open')"):
            ok("sidebar profile menu opens")
        else: bad("sidebar menu")
        page.keyboard.press("Escape"); page.wait_for_timeout(250)

        print("\n\033[1mUser creation permissions\033[0m\n")
        page.goto(f"{BASE}/app/users.html", wait_until="networkidle"); page.wait_for_timeout(1700)
        page.click("[data-create]"); page.wait_for_timeout(700)
        ok("create form has account-type picker") if page.query_selector("#uf-role") else bad("role picker")
        roles = page.eval_on_selector_all("#uf-role option","e=>e.map(x=>x.value)")
        if "admin" in roles and "super_admin" in roles:
            ok(f"super admin can create admin + super admin ({len(roles)} options)")
        else: bad("role options",str(roles))
        page.select_option("#uf-role","admin"); page.wait_for_timeout(400)
        h = page.text_content(".modal-head h2")
        ok("modal title follows chosen role") if "administrator" in h.lower() else bad("modal title",h)
        page.fill("#uf-name","QA Admin"); page.fill("#uf-email","qa.admin@example.com")
        page.fill("#uf-empid","IMS-7777")
        page.click("button[form='user-form']"); page.wait_for_timeout(2200)
        ok("admin account created") if not page.query_selector(".modal") else bad("admin creation")

        print("\n\033[1mTOF & calculator\033[0m\n")
        page.goto(f"{BASE}/app/observation.html", wait_until="networkidle"); page.wait_for_timeout(1800)
        page.click("[data-new]"); page.wait_for_timeout(900)
        secs = page.eval_on_selector_all("[data-section]","e=>e.length")
        crit = page.eval_on_selector_all("[data-criterion]","e=>e.length")
        ok(f"TOF renders 7 sections ({secs})") if secs==7 else bad("TOF sections",str(secs))
        ok(f"TOF renders 36 criteria ({crit})") if crit==36 else bad("TOF criteria",str(crit))
        first = page.eval_on_selector_all("[data-section='s1'] [data-criterion]","e=>e.map(x=>x.getAttribute('data-criterion'))")
        for cid in first:
            page.click(f"label[for='r-{cid}-3']"); page.wait_for_timeout(80)
        page.wait_for_timeout(400)
        s1 = page.text_content("[data-sec='s1']")
        ok(f"section score computes live ({s1})") if "100" in s1 else bad("section score",s1)
        page.click("[data-cancel]"); page.wait_for_timeout(500)
        c = page.query_selector("[data-act='confirm']")
        if c: c.click(); page.wait_for_timeout(600)

        page.goto(f"{BASE}/app/calculator.html", wait_until="networkidle"); page.wait_for_timeout(1800)
        page.click("[data-calc]"); page.wait_for_timeout(800)
        page.click("[data-sample]"); page.wait_for_timeout(700)
        tot = page.text_content(".calc-total-value")
        ok(f"calculator reproduces workbook ({tot.strip()})") if "94.66" in tot else bad("calculator",tot)
        page.fill("input[name='attendance']","80"); page.wait_for_timeout(600)
        imp = page.text_content(".calc-total-right .fw-medium")
        ok("sub-threshold component flagged") if "Attendance" in imp else bad("gap flag",imp)
        page.keyboard.press("Escape"); page.wait_for_timeout(400)

        print("\n\033[1mLearner journey\033[0m\n")
        page.evaluate("""() => {
            const u=GGL.data.demoAccounts.find(x=>x.role==='end_user');
            localStorage.setItem('ggl.session', JSON.stringify({userId:u.id,signedInAt:new Date().toISOString()}));
        }""")
        page.goto(f"{BASE}/app/users.html", wait_until="networkidle"); page.wait_for_timeout(1000)
        ok("learner blocked from user management") if page.query_selector("text=access") else bad("learner blocked")
        page.goto(f"{BASE}/app/assessments.html", wait_until="networkidle"); page.wait_for_timeout(1900)
        start = page.query_selector("[data-take]")
        if not start: bad("learner has assessment available")
        else:
            start.click(); page.wait_for_timeout(800)
            ok("assessment player opens") if page.query_selector("#quiz") else bad("assessment player")
            answered=0
            for _ in range(12):
                o = page.query_selector(".quiz-option")
                if not o: break
                o.click(); page.wait_for_timeout(200); answered+=1
                n = page.query_selector("[data-next]"); lbl=(n.inner_text() or "").lower()
                n.click(); page.wait_for_timeout(350)
                if "submit" in lbl: break
            page.wait_for_timeout(1800)
            ok(f"assessment graded ({answered} answered)") if page.query_selector(".chart-gauge") else bad("grading")
            page.keyboard.press("Escape"); page.wait_for_timeout(400)

        print("\n\033[1mNewsfeed\033[0m\n")
        page.goto(f"{BASE}/app/newsfeed.html", wait_until="networkidle"); page.wait_for_timeout(1900)
        posts = page.eval_on_selector_all(".post","e=>e.length")
        ok(f"feed renders posts ({posts})") if posts>0 else bad("feed empty")
        ok("learner cannot publish") if not page.query_selector("[data-compose]") else bad("learner can publish")
        lk = page.query_selector("[data-like]")
        before = lk.inner_text(); lk.click(); page.wait_for_timeout(700)
        ok("like registers") if page.query_selector("[data-like]").inner_text()!=before else bad("like")

        print("\n\033[1mPublic site\033[0m\n")
        errs.clear()
        page.goto(f"{BASE}/index.html", wait_until="networkidle"); page.wait_for_timeout(1200)
        caps = page.eval_on_selector_all("#capabilities .feature-card","e=>e.length")
        ok(f"capability cards render ({caps})") if caps==8 else bad("capability cards",str(caps))
        tones = page.eval_on_selector_all("#capabilities .tone-1,#capabilities .tone-5","e=>e.length")
        ok("capability cards carry distinct tones") if tones>=2 else bad("card tones",str(tones))
        heroImg = page.evaluate("""() => {
            const el=document.querySelector('.hero-bg');
            return el ? getComputedStyle(el).backgroundImage : 'none';
        }""")
        ok("hero artwork is applied") if "hero-dark" in heroImg else bad("hero artwork",heroImg[:40])
        pills = page.eval_on_selector_all(".module-pill","e=>e.length")
        ok(f"module pills render ({pills})") if pills>20 else bad("module pills",str(pills))
        page.click("[data-billing='yearly']"); page.wait_for_timeout(500)
        ok("pricing toggle works") if page.text_content(".price-card .amt") else bad("pricing toggle")
        page.click(".faq-q"); page.wait_for_timeout(400)
        ok("FAQ expands") if page.query_selector(".faq-a.open") else bad("FAQ")
        bad("public console clean","; ".join(errs[:2])) if errs else ok("public console clean")
        ctx.close()

        print("\n\033[1mResponsive\033[0m\n")
        for label,w,h in VIEWPORTS:
            ctx = b.new_context(viewport={"width":w,"height":h}, is_mobile=(label=="mobile"))
            page = ctx.new_page(); e2=[]
            page.on("console", lambda m: e2.append(m.text) if m.type=="error" else None)
            page.on("pageerror", lambda x: e2.append(str(x)))
            sign_in(page)
            issues=[]
            for route,name in ROUTES:
                page.goto(f"{BASE}{route}", wait_until="networkidle"); page.wait_for_timeout(650)
                o = overflow(page)
                if o: issues.append(f"{name}: {', '.join(o)}")
            bad(f"{label} ({w}px) no overflow", issues[0]) if issues else ok(f"{label} ({w}px) no overflow across {len(ROUTES)} routes")
            bad(f"{label} console clean","; ".join(e2[:2])) if e2 else ok(f"{label} console clean")
            if label in ("mobile","tablet"):
                page.goto(f"{BASE}/app/dashboard.html", wait_until="networkidle"); page.wait_for_timeout(800)
                page.click("[data-sidebar-open]"); page.wait_for_timeout(500)
                op = page.eval_on_selector(".app-sidebar","e=>e.classList.contains('open')")
                ok(f"{label} drawer opens") if op else bad(f"{label} drawer")
            ctx.close()
        b.close()
    httpd.shutdown()
    tot=res["p"]+res["f"]
    print("\n"+"-"*50); print(f"  Checks: {tot}   Passed: {res['p']}   Failed: {res['f']}"); print("-"*50+"\n")
    if fails:
        print("Failures:"); [print(f"  - {f}") for f in fails]; print()
    sys.exit(1 if res["f"] else 0)

if __name__ == "__main__": main()
