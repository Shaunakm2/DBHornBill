from pathlib import Path
from bs4 import BeautifulSoup
import sys
r=Path(__file__).resolve().parent.parent
html=(r/'index.html').read_text(); css=(r/'assets/css/product-site.css').read_text(); js=(r/'assets/js/product-site.js').read_text(); core=(r/'assets/js/core.js').read_text(); pages=(r/'assets/js/pages.js').read_text(); s=BeautifulSoup(html,'html.parser')
checks=[]
def c(n,v): checks.append((n,bool(v)))
c('single H1',len(s.find_all('h1'))==1)
c('hero dashboard removed',not s.select_one('.hero-app'))
c('single-cycle retained',bool(s.select_one('.cycle-section')) and 'One connected cycle' in html)
c('ecosystem removed',not s.select_one('.ecosystem-section'))
c('role workspaces retained',bool(s.select_one('.experiences-section')))
c('capability intelligence removed',not s.select_one('.intelligence-section'))
c('tour removed',not s.select_one('.tour-section'))
c('closing CTA removed',not s.select_one('.closing-section'))
c('membership retained',bool(s.select_one('.membership-section')))
c('journal inserted',bool(s.select_one('.journal-section')) and len(s.select('.journal-section a[href^="blog/"]'))==4)
c('blog files resolve',all((r/a['href']).exists() for a in s.select('.journal-section a[href^="blog/"]')))
c('hero one canvas','min-height:100vh' in css)
c('cycle one canvas','.cycle-section{min-height:100vh' in css)
c('individual purchasable nav','purchasable' in core and "'Trainer Observation'" in core)
c('individual TOF entitlement',"workspaceType !== 'individual'" in pages and "active:'observation'" in pages)
c('removed JS guarded',"if($('.ecosystem-tabs'))initEco()" in js and "if($('.tour-tabs'))initTour()" in js)
for n,v in checks: print(('PASS' if v else 'FAIL'),n)
print(f'\n{sum(v for _,v in checks)}/{len(checks)} checks passed')
sys.exit(0 if all(v for _,v in checks) else 1)
