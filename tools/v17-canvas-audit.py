from pathlib import Path
from bs4 import BeautifulSoup
import sys
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text(); css=(root/'assets/css/product-site.css').read_text(); js=(root/'assets/js/product-site.js').read_text(); soup=BeautifulSoup(html,'html.parser')
checks=[]
def c(name,value): checks.append((name,bool(value)))
c('hero contains one focused canvas',bool(soup.select_one('.product-hero .hero-copy')) and bool(soup.select_one('.hero-capability-strip')))
c('hero dashboard remains removed',not soup.select_one('.hero-app'))
c('cycle section retained',bool(soup.select_one('.cycle-section .capability-orbit')))
c('cycle has nine interactive stages',all("n:'%s'"%x in js for x in ['Diagnose','Design','Plan','Deliver','Assess','Coach','Observe','Measure','Improve']))
c('cycle uses bounded canvas','height:var(--canvas-h)!important' in css and 'width:min(440px,43vw)!important' in css)
c('cycle inspector transition','cycle-inspector.is-updating' in css and "classList.add('is-updating')" in js)
c('cycle signal animation','@keyframes signalTravel' in css and '@keyframes signalBeam' in css)
c('journal is a bounded canvas','.journal-section,.membership-section{height:var(--canvas-h)!important' in css)
c('membership is a bounded canvas',bool(soup.select_one('.membership-section')) and '.purchase-card{height:100%;max-height:450px}' in css)
c('newsletter signup',bool(soup.select_one('#newsletter-form')) and 'Subscribed in this prototype' in js)
c('company footer links',len(soup.select('footer .footer-links a'))==7)
c('social icons remain',len(soup.select('footer .social-links a'))==4)
c('company routes resolve',all((root/a['href']).exists() for a in soup.select('footer .footer-links a')))
c('mobile falls back to natural height','height:auto!important;max-height:none' in css)
c('reduced motion supported','prefers-reduced-motion:reduce' in css)
for name,value in checks: print(('PASS' if value else 'FAIL'),name)
print(f'\n{sum(v for _,v in checks)}/{len(checks)} checks passed')
sys.exit(0 if all(v for _,v in checks) else 1)
