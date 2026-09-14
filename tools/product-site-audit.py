from pathlib import Path
from bs4 import BeautifulSoup
import subprocess,re,sys
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text();css=(root/'assets/css/product-site.css').read_text();js=(root/'assets/js/product-site.js').read_text();s=BeautifulSoup(html,'html.parser')
checks=[]
def check(name,ok):checks.append((name,bool(ok)))

check('audience tabs',len(s.select('[data-audience]'))==2)
check('membership variants',len(s.select('[data-purchase]'))==3 and 'One Membership' in html and 'Build Your Own' in html)
check('GG Genie',bool(s.select_one('.gg-genie')) and 'Leadership training' in html)
check('launchpad route',(root/'app/launchpad.html').exists() and (root/'assets/js/launchpad.js').exists())
check('Poppins and Raleway','Poppins' in css and 'Raleway' in css)
check('viewport storytelling','scroll-snap-type:y proximity' in css)

check('single semantic H1',len(s.find_all('h1'))==1)
check('product UI in hero',bool(s.select_one('.hero-app .app-preview-sidebar')) and len(s.select('.hero-app .metric-row article'))==4)
check('required hero sidebar items',all(x in html for x in ['Dashboard','Capability','Learning','Assessments','Coaching','Observation','Analytics','Reports','Settings']))
check('dashboard content complete',all(x.lower() in html.lower() for x in ['Capability Health','Learning Effectiveness','Completion','Learning Transfer','Capability heatmap','Recent assessments','Coaching activity']))
check('no fake logos',all(x not in html.upper() for x in ['NORTHWIND','ACME GROUP','CONTOSO','FABRIKAM','LITWARE']))
check('nine cycle stages',all("n:'%s'"%x in js for x in ['Diagnose','Design','Plan','Deliver','Assess','Coach','Observe','Measure','Improve']))
check('six ecosystem categories',all(x+':[' in js for x in ['Diagnose','Design','Deliver','Assess','Develop','Measure']))
check('three experiences',len(s.select('[data-role]'))==3 and all("%s:{"%x in js for x in ['super','ld','learner']))
check('capability intelligence metrics',all(x in html for x in ['87%','81%','85%','89%','76%']))
check('six tour stages',all("['%s'"%x in js for x in ['Diagnose','Plan','Learn','Assess','Coach','Measure']))
check('responsive mobile breakpoint','@media(max-width:760px)' in css)
check('mobile cycle vertical','.capability-orbit{aspect-ratio:auto' in css)
check('reduced motion','prefers-reduced-motion' in css)
check('minimum target', 'min-height:42px' in css and 'height:48px' in css)
check('login uses service seam','GGL.services.auth.signIn' in js)
check('actual responsive components',not bool(s.select('.hero-app img')))
check('meta description',bool(s.find('meta',attrs={'name':'description'})))
check('Open Graph',len(s.find_all('meta',attrs={'property':re.compile('^og:')}))>=3)
check('skip link',bool(s.select_one('.skip-link[href="#main"]')))
ids={x['id'] for x in s.select('[id]')}
check('local anchors resolve',all(a['href'][1:] in ids for a in s.select('a[href^="#"]') if len(a['href'])>1))
refs=[]
for tag,attr in [('link','href'),('script','src')]:
 for n in s.find_all(tag):
  v=n.get(attr,'')
  if v and not v.startswith(('http','#')):refs.append(v)
check('homepage assets resolve',all((root/v).exists() for v in refs))
check('no missing image references','../img/' not in (root/'assets/css/site.css').read_text())
for name,ok in checks:print(('PASS' if ok else 'FAIL'),name)
print('\n%d/%d checks passed'%(sum(ok for _,ok in checks),len(checks)))
sys.exit(0 if all(ok for _,ok in checks) else 1)
