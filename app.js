/* Recruitment ATS — training sandbox : application */
(function(){
"use strict";

/* ---------------------------------------------------------------- helpers */
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var SEQ={};
var uid=function(p){SEQ[p]=(SEQ[p]||0)+1;return p+'-'+String(1000+SEQ[p]);};
var TODAY=new Date();TODAY.setHours(9,0,0,0);
var day=864e5;
var dOff=function(n){return new Date(TODAY.getTime()+n*day);};
var iso=function(d){return new Date(d).toISOString().slice(0,10);};
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var fmtD=function(d){if(!d)return '—';var x=new Date(d);return x.getDate()+' '+MON[x.getMonth()]+' '+String(x.getFullYear()).slice(2);};
var fmtDT=function(d){var x=new Date(d),h=x.getHours(),m=String(x.getMinutes()).padStart(2,'0');
  var ap=h>=12?'pm':'am';h=h%12||12;return fmtD(d)+' '+h+':'+m+ap;};
var ago=function(d){var n=Math.floor((Date.now()-new Date(d).getTime())/day);
  return n<=0?'today':(n===1?'yesterday':n+' days ago');};
var daysBetween=function(a,b){return Math.round((new Date(b)-new Date(a))/day);};
var money=function(n){return n==null?'—':'$'+Number(n).toLocaleString();};
var pct=function(a,b){return b?Math.round(a/b*100):0;};
var byId=function(arr,id){for(var i=0;i<arr.length;i++)if(arr[i].id===id)return arr[i];return null;};

/* ---------------------------------------------------------------- vocabulary */
var PIPE=[
  {k:'New Lead',            c:'var(--p1)',help:'On the pipeline, not yet qualified by you.'},
  {k:'Internal Submission', c:'var(--p2)',help:'Written up and sitting at your own quality gate.'},
  {k:'Client Submission',   c:'var(--p3)',help:'Sent to the client contact. This creates the sendout.'},
  {k:'Interview Scheduled', c:'var(--p4)',help:'An appointment exists on the record.'},
  {k:'Offer Extended',      c:'var(--p5)',help:'Terms with the candidate, pending acceptance.'},
  {k:'Placed',              c:'var(--p6)',help:'Accepted. A placement is created for approval.'}
];
var PIPE_K=PIPE.map(function(s){return s.k;});
var PIPE_OUT=['Client Declined','Candidate Declined','Not Proceeding'];
var pIx=function(k){return PIPE_K.indexOf(k);};
var pColor=function(k){
  if(k==='Client Declined')return 'var(--bad)';
  if(k==='Candidate Declined')return '#B4553F';
  if(k==='Not Proceeding')return 'var(--ink3)';
  return (PIPE[pIx(k)]||{}).c||'var(--p1)';
};
var JO_STATUS=['Accepting Candidates','Covered','Filled','On Hold','Closed','Cancelled'];
var JO_TYPE=['Contract','Contract To Hire','Direct Hire'];
var CD_STATUS=['New Lead','Active','Available','Submitted','Placed','Do Not Call','Archive'];
var CO_STATUS=['Prospect','Active Client','Inactive','Former Client','Do Not Contact'];
var PL_STATUS=['Pending Approval','Approved','Rejected','Completed','Terminated'];
var EMP_TYPE=['W2','1099','Corp to Corp','Permanent'];
var NOTE_ACTIONS=['Prescreen','Outbound Call','Inbound Call','Left Message','Email','Meeting',
  'Interview','Reference Check','Client Visit','Internal Memo','Other'];
/* Employment type depends on the job order type: only a direct hire is permanent. */
var EMP_BY_TYPE={'Contract':['W2','1099','Corp to Corp'],
  'Contract To Hire':['W2','1099','Corp to Corp'],'Direct Hire':['Permanent']};
var CD_SOURCES=['LinkedIn','Indeed','Job Board','Company Website','Referral','Recruiter Outreach','Other'];
var LEAD_STATUS=['New Lead','In Process','Converted','Archive'];
var OPP_STATUS=['Open','Won','Lost'];
var CATEGORIES=['Information Technology','Light Industrial','Admin & Clerical','Healthcare',
  'Engineering','Finance & Accounting','Customer Support','Skilled Trades','Retail Operations'];
var ONBOARD=[
  {k:'rtw', t:'Right to work verified',            h:'Identity and eligibility evidence on file before day one.'},
  {k:'contract',t:'Signed contract returned',      h:'Rates and end date must match the placement record.'},
  {k:'bgv', t:'Background check cleared',          h:'Client-mandated on this account.'},
  {k:'cred',t:'Credentials and licences current',  h:'Expiry dates recorded, not just presence of a document.'},
  {k:'induction',t:'Client induction completed',   h:'Site access and system logins issued.'},
  {k:'payroll',t:'Payroll and bank details captured',h:'Blocks the first invoice if missing.'}
];

/* ================================================================ CV pool generator */
function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

var FIRST=['Marcus','Ivy','Owen','Renata','Peter','Adaeze','Sofia','Hugo','Bea','Cyrus','Nadia','Elliot',
'Aisha','Bernard','Camille','Dmitri','Elena','Farid','Gabriela','Hassan','Imani','Jonas','Katya','Lucas',
'Mira','Noor','Oscar','Priya','Quentin','Rosa','Samir','Tania','Umar','Valeria','Wesley','Xiomara','Yusuf',
'Zara','Alonzo','Bridget','Cedric','Dahlia','Emeka','Freya','Gustavo','Helena','Ibrahim','Josefina','Kwame',
'Larissa','Mateo','Nia','Ola','Paloma','Rashid','Sinead','Tobias','Ursula','Vikram','Willa','Yara','Zane',
'Anika','Boris','Clara','Devon','Esme','Fabian','Greta','Hector','Isla','Jamal','Keiko','Leandro','Marisol',
'Nikolai','Odette','Pavel','Rania','Sven','Thandiwe','Ulric','Vera','Wren','Xavier','Yolanda','Zoltan'];
var LAST=['Delaney','Chandran','Baptiste','Sol','Nkemelu','Kalu','Marchetti','Lindqvist','Toussaint','Ahmadi',
'Farouk','Kwan','Okonjo','Petrov','Nakamura','Oyelaran','Vasquez','Bergstrom','Adeyemi','Castellanos','Duval',
'Eriksen','Fitzgerald','Gallardo','Hollis','Iqbal','Jansen','Kovacs','Lombardi','Mbeki','Nadeau','Ortega',
'Pfeiffer','Quintero','Rasmussen','Sandoval','Thibault','Ustinov','Villareal','Whitmore','Yamamoto','Zielinski',
'Abara','Bhatt','Corrigan','Dossantos','Ekstrom','Ferreira','Grzegorz','Haddad','Ivanova','Jimenez','Kaur',
'Larsen','Moreau','Novak','Osei','Pereira','Rahimi','Serrano','Tanaka','Uddin','Voss','Wickham','Xu','Yilmaz','Zamora'];
/* ---- expanded name pools: 3,000 unique names needs far more combinations than before ---- */
var FIRST2=['Aaliyah','Abel','Abigail','Adam','Adrian','Agnes','Ahmed','Aidan','Aileen','Ajay',
'Alan','Alba','Alec','Alexis','Alfred','Alice','Alina','Allan','Alma','Alonso','Althea','Alvin',
'Amara','Ambrose','Amelia','Amir','Anders','Andrea','Angus','Anita','Anselm','Anthony','Antonia',
'Apollo','Arabella','Archer','Arden','Ariel','Arjun','Arlene','Armand','Arnav','Aroha','Arthur',
'Asha','Ashton','Astrid','Athena','Aubrey','Augustin','Aurora','Austin','Avery','Axel','Ayesha',
'Bailey','Barbara','Bartek','Basil','Beatrix','Belinda','Benedict','Bennett','Bertie','Beverly',
'Bianca','Blaise','Blake','Bonnie','Boyd','Bradley','Brandon','Brianna','Bridie','Brody','Bruno',
'Bryony','Caleb','Callum','Cameron','Camila','Candace','Carla','Carlos','Carmen','Carter','Casey',
'Cassia','Cecil','Celeste','Cesar','Chandra','Charlie','Chelsea','Chidi','Chloe','Christa','Cillian',
'Clarissa','Claude','Clement','Clifford','Colette','Colin','Conrad','Constance','Cora','Cormac',
'Cristina','Curtis','Cynthia','Dagmar','Dalia','Damian','Daniela','Danika','Dante','Daphne','Darius',
'Darren','Davina','Dawn','Dean','Deborah','Declan','Delia','Denise','Derek','Desmond','Diana',
'Diego','Dilan','Dimitri','Dolores','Dominic','Donna','Dorian','Douglas','Dulce','Duncan','Dylan',
'Eamon','Ebony','Edgar','Edith','Eduardo','Efe','Eileen','Elaine','Eleanor','Elias','Elif','Elise',
'Ellery','Elodie','Emil','Emiko','Emmett','Enid','Enzo','Ephraim','Eric','Erika','Ernest','Esther',
'Ethan','Etienne','Eugenia','Eva','Evelyn','Ewan','Ezra','Fabiola','Faisal','Farrah','Federico',
'Felicity','Fenton','Fergus','Fern','Fidel','Finlay','Fiona','Fletcher','Flora','Florian','Forrest',
'Frances','Frank','Freddie','Fredrik','Gabriel','Gail','Galina','Gareth','Garrett','Gavin','Gemma',
'Genevieve','George','Gerald','Gia','Gideon','Gillian','Giovanni','Gladys','Glenn','Gloria','Gordon',
'Grace','Graham','Gregor','Griselda','Guillermo','Gwen','Hadley','Hafsa','Hamish','Hanna','Harold',
'Harriet','Haruto','Hayden','Hazel','Heath','Hedda','Heidi','Helen','Henrik','Hester','Hilda',
'Hollis','Honor','Hope','Horace','Hosea','Hugh','Hussein','Ian','Ibrahim','Ida','Idris','Ignacio',
'Ilana','Imran','Ines','Ingrid','Iona','Irene','Iris','Irina','Isaac','Isabel','Ishaan','Isla',
'Ismael','Ivan','Ivy','Jacinta','Jacob','Jade','Jagger','Jamal','Janet','Jarrah','Jasmine','Jasper',
'Javier','Jaya','Jean','Jed','Jemima','Jenna','Jerome','Jessa','Jethro','Jian','Jillian','Joanna',
'Joaquin','Jocelyn','Jodie','Joel','Johan','Jolene','Jonah','Jordan','Jorge','Josiah','Joyce',
'Juan','Judith','Julia','Julius','June','Juniper','Justine','Kade','Kaia','Kalinda','Kamal','Kara',
'Karim','Karla','Kasper','Kate','Kavya','Keegan','Keira','Kelvin','Kenji','Kenneth','Kerry','Keziah',
'Khadija','Kian','Kiera','Kirsten','Klaus','Kofi','Kristin','Kurt','Kyra','Lachlan','Ladan','Laila',
'Lambert','Lana','Lara','Lars','Latifa','Laurel','Lavinia','Lawrence','Leah','Leandra','Lenore',
'Leon','Leopold','Lesley','Levi','Lewis','Lex','Lidia','Lilian','Lincoln','Linus','Lionel','Liora',
'Lisbeth','Llewelyn','Logan','Lola','Lorcan','Lorna','Lottie','Louis','Lourdes','Lowell','Lucia',
'Lucius','Ludo','Luisa','Luka','Luther','Lydia','Lyle','Mabel','Madison','Magdalena','Magnus',
'Mahesh','Maisie','Malachi','Malia','Mamadou','Manon','Marcel','Margot','Marisa','Marlon','Marnie',
'Marshall','Martha','Marvin','Mateus','Mathilde','Maud','Maurice','Maxine','Maya','Mei','Melina',
'Mercedes','Meredith','Micah','Michelle','Mila','Miles','Millicent','Miranda','Miriam','Mitchell',
'Moana','Mohsin','Molly','Monica','Montgomery','Morag','Morris','Moses','Muriel','Myles','Nadine',
'Nala','Nancy','Naomi','Nasir','Natasha','Nathaniel','Neave','Nedra','Neil','Nell','Nelson','Nerea',
'Nicholas','Nikhil','Nils','Nina','Noel','Nolan','Norah','Norman','Nuala','Nyla','Oakley','Obadiah',
'Octavia','Odell','Ofelia','Olga','Oliver','Olwen','Omar','Ophelia','Orla','Orson','Oscar','Osman',
'Otto','Owain','Paloma','Pamela','Pascal','Patience','Patrick','Paulette','Pearl','Pedro','Penny',
'Percival','Perry','Petra','Phoebe','Pierce','Pilar','Piper','Portia','Prakash','Preston','Primrose',
'Quinn','Rachel','Radha','Rafael','Raheem','Ramona','Randall','Raphael','Raquel','Rashida','Raul',
'Raven','Reese','Regina','Reid','Remy','Rene','Reuben','Rhiannon','Ricardo','Rita','Roberta',
'Robin','Rocco','Roderick','Roisin','Roland','Romilly','Ronan','Rosalind','Roscoe','Rowan','Roxana',
'Ruby','Rudolph','Rufus','Ruth','Ryan','Sabine','Sadie','Saffron','Salim','Sally','Salvador',
'Samira','Sandra','Santiago','Saoirse','Sarah','Saskia','Saul','Scarlett','Sean','Seraphina','Sergio',
'Seth','Shannon','Sharon','Sheila','Shirley','Sidney','Sienna','Sigrid','Silas','Simone','Sinead',
'Siobhan','Sloane','Sofia','Solomon','Sonia','Soren','Stanley','Stella','Stewart','Sunita','Susanna',
'Sybil','Sylvia','Tabitha','Tadhg','Talia','Tamsin','Tanvi','Tara','Tariq','Tatiana','Teagan','Tess',
'Thaddeus','Thea','Theodore','Thomas','Tia','Tilda','Timothy','Tobias','Tomas','Toni','Tristan',
'Trudy','Tyler','Ulises','Una','Ursula','Uzoma','Valentina','Vance','Vanessa','Vaughn','Vera',
'Verity','Vernon','Veronica','Vicente','Victor','Vidya','Vincent','Viola','Virgil','Vivienne',
'Wallace','Walter','Wanda','Warren','Wendy','Wesley','Whitney','Wilbur','Wilhelmina','Willa',
'Winifred','Wyatt','Xander','Ximena','Yara','Yasmin','Yohan','Yolanda','Yusra','Yvette','Zachary',
'Zainab','Zane','Zara','Zelda','Zeynep','Zoe','Zola','Zubair'];

var LAST2=['Abbott','Abraham','Acheson','Ackerman','Adeyemo','Aguilar','Ahluwalia','Ainsworth',
'Akande','Alberts','Alcott','Alderman','Almeida','Alvarado','Amos','Andersson','Annan','Anthony',
'Appleby','Aquino','Archibald','Ardern','Arias','Armitage','Arnett','Ashby','Ashworth','Atherton',
'Attwood','Aubert','Auclair','Avila','Ayers','Babcock','Bagley','Bailey','Bakhtiari','Balcombe',
'Baldwin','Ballard','Banda','Bannister','Barclay','Barlowe','Barnaby','Barrera','Barrington','Bartlett',
'Baskerville','Bassey','Bateson','Baxendale','Beaumont','Beckford','Bellamy','Benedetti','Benitez',
'Bennington','Berger','Bernard','Bertrand','Bhattacharya','Biggs','Billingham','Birchall','Bishara',
'Blackwood','Blanchard','Blythe','Boateng','Bolton','Bonham','Booker','Borges','Boswell','Bouchard',
'Bourne','Bowden','Bradshaw','Braithwaite','Brannigan','Brennan','Bridgewater','Brightwell','Brockman',
'Bronson','Brookfield','Broughton','Bruckner','Buckley','Bullock','Bunting','Burdett','Burkhardt',
'Burnside','Butterfield','Byrne','Cadogan','Cahill','Calderon','Callaghan','Calloway','Camberwell',
'Campion','Cardoso','Carlisle','Carmichael','Carrington','Cartwright','Casey','Castellano','Cavanagh',
'Cervantes','Chadwick','Chalmers','Chamberlain','Chandler','Chatterjee','Cheng','Chevalier','Chiba',
'Chikwe','Chisholm','Chowdhury','Christensen','Clarkson','Claybourne','Cleary','Clifton','Coetzee',
'Colborne','Coleridge','Collingwood','Comerford','Conteh','Copeland','Corbett','Cordova','Cornish',
'Cortez','Costello','Coulter','Courtney','Cowan','Craddock','Cranfield','Crawley','Cresswell',
'Crichton','Crompton','Crosbie','Culverhouse','Cumberland','Cunningham','Dabrowski','Dalgleish',
'Dalrymple','Danforth','Darby','Dashwood','Davenport','Delacroix','Dembele','Denholm','Derrick',
'Devereux','Dhillon','Dias','Dietrich','Dillard','Dinsmore','Doherty','Donnelly','Dorsett','Doughty',
'Dowling','Draper','Driscoll','Duarte','Dufresne','Dunkley','Durand','Dvorak','Eastwood','Eberhardt',
'Edmonds','Egbuna','Ehrlich','Eldridge','Ellington','Elmore','Emerson','Endicott','Engelbrecht',
'Enriquez','Escobar','Esparza','Everard','Fairbairn','Falconer','Farnsworth','Faulkner','Fellowes',
'Fenwick','Ferrari','Fielding','Finnegan','Fitzsimmons','Flanagan','Fleischer','Fletcher','Flynn',
'Fontaine','Forsythe','Fortescue','Foster','Fournier','Frampton','Franklin','Fraser','Frobisher',
'Fuentes','Gainsborough','Galloway','Gambhir','Garrity','Gascoigne','Gatling','Gauthier','Gearing',
'Geldof','Gentry','Gerhardt','Ghosh','Gibbons','Gifford','Gillespie','Glenister','Godfrey','Goldsmith',
'Gonsalves','Goodwin','Gorman','Grantham','Greaves','Greenhalgh','Gregson','Grimsby','Guerrero',
'Gunderson','Gupta','Hackett','Haddon','Hagen','Halloran','Hamilton','Hanrahan','Harcourt','Hargrave',
'Harkness','Harmon','Hartley','Haslam','Hathaway','Havelock','Hawkins','Hayward','Heathcote','Hedley',
'Helmsley','Henshaw','Hepburn','Herrera','Hewitt','Hickman','Hidalgo','Higginbotham','Hillier',
'Hinojosa','Hobbs','Hockley','Hodgkinson','Hollingworth','Holroyd','Honeycutt','Hopkirk','Horowitz',
'Houghton','Howarth','Hoyland','Huang','Hubbard','Huddleston','Hulme','Humphrey','Hutchings','Ibarra',
'Ilesanmi','Ingham','Ingleby','Irvine','Ishikawa','Iversen','Jablonski','Jacobsen','Jamieson',
'Jarvis','Jefferies','Jennings','Jessop','Jimenez','Johansson','Jolliffe','Josephs','Kaczmarek',
'Kalinowski','Kamau','Kapoor','Karlsson','Kavanagh','Keaton','Keegan','Kellerman','Kemble','Kendrick',
'Kenworthy','Kerrigan','Kessler','Khatri','Kilbride','Kinsella','Kirkbride','Kitchener','Klimenko',
'Knowles','Kobayashi','Koenig','Kolawole','Kowalczyk','Kramer','Krishnan','Kuznetsov','Lachlan',
'Ladbroke','Lafferty','Laird','Lambourne','Lancaster','Langford','Lanigan','Larkin','Latimer',
'Lavelle','Lawrenson','Leadbetter','Leblanc','Ledger','Leighton','Lennox','Leonard','Lestrange',
'Lightfoot','Lindstrom','Linley','Littlewood','Livingstone','Llewellyn','Lockhart','Loftus','Longstaff',
'Lonsdale','Lovegrove','Lowry','Lucero','Ludlow','Lyndhurst','Macaulay','Macdonald','Mackintosh',
'Maddox','Magnusson','Mahmood','Mainwaring','Makinde','Malinowski','Mallory','Mandel','Manningham',
'Marchetti','Marlborough','Marsden','Martinelli','Mascarenhas','Mason','Masterson','Mathieson',
'Maulding','Maxwell','Mbeki','McAlister','McBride','McCafferty','McCourt','McDermott','McEwan',
'McGarrity','McGovern','McKellar','McLoughlin','McNamara','Meadows','Medeiros','Mehta','Melbourne',
'Mendelsohn','Merriman','Metcalfe','Middleton','Milburn','Millington','Minchin','Mirza','Mitford',
'Mohammed','Molyneux','Monaghan','Montague','Moorcroft','Morales','Moriarty','Mortimer','Mowbray',
'Mubarak','Mulholland','Munroe','Murchison','Nakashima','Napier','Narayanan','Naylor','Nesbitt',
'Neumann','Newcombe','Nicolson','Nightingale','Nkosi','Norrington','Northcote','Nunes','Nwachukwu',
'Oakeshott','Obiora','Ochoa','Odhiambo','Ogilvy','Okafor','Oldfield','Olivares','Ollivander','Olsen',
'Onwuka','Oppenheim','Orlov','Ormsby','Ortega','Osbourne','Oswald','Ottaway','Overton','Oyelowo',
'Padilla','Paget','Palmerston','Pankhurst','Papadopoulos','Pardoe','Parkinson','Pashley','Patel',
'Paterson','Pattinson','Pemberton','Pendleton','Penhaligon','Peralta','Perrin','Pettigrew','Pfister',
'Philpott','Pickering','Pilkington','Pinto','Playfair','Plunkett','Ponsonby','Popescu','Porras',
'Postlethwaite','Poulson','Prentice','Prescott','Prideaux','Pritchard','Puglisi','Purcell','Quigley',
'Quintanilla','Radcliffe','Rahman','Ramsbottom','Randolph','Rankine','Rasmussen','Rathbone','Ravenscroft',
'Rawlinson','Redmayne','Reinhardt','Renshaw','Restrepo','Reynolds','Rhodes','Ricci','Ridgeway',
'Rigsby','Rivers','Robeson','Rochester','Roddick','Rodrigues','Rollins','Romano','Rookwood','Roscoe',
'Rosenthal','Rothwell','Rousseau','Rowntree','Ruddock','Rushforth','Rutherford','Ryder','Sablewski',
'Sackville','Saldana','Salgado','Sampson','Sandhu','Sarkissian','Satterfield','Saunders','Savarese',
'Scarborough','Schofield','Schreiber','Scrivener','Seabrook','Sedgwick','Selby','Serrato','Shackleton',
'Sharpe','Shelby','Sheridan','Sherwood','Shipley','Shrestha','Sidhu','Silvestre','Simmonds','Sinclair',
'Skinner','Slattery','Smollett','Snowden','Solberg','Somerville','Sorensen','Southgate','Spellman',
'Spencer','Squire','Stack','Stanhope','Stapleton','Stavros','Steadman','Stenhouse','Stirling',
'Stockwell','Stoddard','Strachan','Stringer','Sturgess','Suarez','Summerfield','Sutcliffe','Swaminathan',
'Swinburne','Sykes','Szabo','Tait','Talbot','Tanaka','Tarrant','Tavares','Teixeira','Templeton',
'Thackeray','Thornbury','Thurgood','Tichborne','Tierney','Tillotson','Tomlinson','Torrance','Toussaint',
'Townshend','Traynor','Tremaine','Trevelyan','Trundle','Tsvetkov','Tuckwell','Turnbull','Tyrrell',
'Underhill','Upton','Urquhart','Vaillancourt','Valdez','Vanburen','Vandenberg','Varga','Vasquez',
'Vaughan','Venables','Verhoeven','Vickery','Villalobos','Vincenzi','Voight','Wadsworth','Wainwright',
'Wakefield','Waldron','Walcott','Wallington','Walmsley','Warburton','Wardlaw','Warrington','Waterhouse',
'Watanabe','Waverley','Weatherby','Wedgwood','Welbeck','Wellesley','Wentworth','Westbrook','Wetherall',
'Whately','Wheatley','Whitcombe','Whittaker','Wickersham','Widdowson','Wilberforce','Wilkerson',
'Willoughby','Winstanley','Winterbourne','Witherspoon','Wollaston','Woodhouse','Worthington','Wrenfield',
'Wyndham','Yamashita','Yeardley','Yildirim','Youngblood','Zaragoza','Zavala','Zielinski','Zimmerman'];

var CV_LOCS=['Aurora','Halcyon','Pemberton','Corvus','Fairhaven','Linden Park','Westgate','Rockvale','Marlowe','Ashford'];
var CV_SOURCES=['LinkedIn','Indeed','Job Board','Company Website','Referral','Recruiter Outreach','Other'];
var CV_AVAIL=['Immediate','1 week','2 weeks','4 weeks','Notice period'];
var CV_EDU=['High school diploma','Associate degree','Bachelor of Science','Bachelor of Arts',
'Vocational diploma','Trade apprenticeship','Postgraduate diploma'];

var VERTICALS={
'Information Technology':{
  n:620,rate:[45,95],
  roles:['Software Engineer','Java Developer','.NET Developer','Front End Developer','DevOps Engineer',
    'Data Engineer','QA Automation Analyst','Systems Administrator','Network Engineer','Help Desk Technician',
    'Cloud Architect','Business Analyst','Cyber Security Analyst','Database Administrator','Scrum Master'],
  skills:['Java','Spring Boot','Python','JavaScript','TypeScript','React','Angular','Node.js','C#','.NET Core',
    'SQL Server','PostgreSQL','MongoDB','AWS','Azure','Docker','Kubernetes','Terraform','Jenkins','CI/CD',
    'Selenium','Cypress','Linux','Windows Server','Active Directory','Cisco','Splunk','Power BI','Tableau',
    'Snowflake','Kafka','REST APIs','GraphQL','Agile','Scrum','Git','Ansible','Bash','PowerShell','Redis'],
  certs:['AWS Certified Solutions Architect','Azure Administrator Associate','CompTIA A+','CompTIA Security+',
    'CCNA','CISSP','PMP','Certified Scrum Master','ITIL Foundation','Oracle Certified Professional','Kubernetes CKA'],
  firms:['Meridian Systems','Blue Harbor Software','Kestrel Data','Northgate Technology','Palladium Digital',
    'Ravenstone IT','Lumen Analytics','Ironwood Cloud','Vertex Payments','Solstice Labs'],
  bullets:['Built and maintained {s1} services handling peak loads of {n}k requests per day',
    'Migrated legacy workloads to {s2}, cutting infrastructure spend by {p} per cent',
    'Automated the release pipeline with {s3}, taking deployments from weekly to daily',
    'Led a team of {t} engineers through an {s4} delivery cycle',
    'Reduced mean time to recovery by {p} per cent through improved monitoring and alerting',
    'Designed the data model and query layer for a reporting platform used by {t} internal teams']},
'Light Industrial':{
  n:540,rate:[17,32],
  roles:['Warehouse Associate','Forklift Operator','Machine Operator','Assembler','Production Supervisor',
    'Shipping and Receiving Clerk','Quality Inspector','Maintenance Technician','Picker Packer','Material Handler',
    'CNC Operator','Welder','Warehouse Team Lead','Inventory Control Clerk'],
  skills:['Forklift','Reach Truck','Order Picker','Sit Down Forklift','RF Scanner','WMS','Pallet Jack',
    'Inventory Control','Cycle Counting','Kitting','Assembly','Blueprint Reading','Calipers','Micrometer',
    'Lean Manufacturing','5S','Kaizen','Six Sigma','MIG Welding','TIG Welding','CNC','Preventive Maintenance',
    'Hydraulics','Pneumatics','OSHA','Shipping','Receiving','Loading Dock','Stand Up Forklift','Cherry Picker'],
  certs:['Forklift Certification','OSHA 10','OSHA 30','Powered Industrial Truck Licence','CPR',
    'Six Sigma Green Belt','HAZMAT Awareness','Lockout Tagout Trained'],
  firms:['Vantage Cold Chain','Ironbark Manufacturing','Cascade Distribution','Redstone Fabrication',
    'Summit Packaging','Halden Logistics','Trellis Components','Anchor Freight','Copperfield Plastics','Vale Metals'],
  bullets:['Operated {s1} equipment across a {t}-bay dock with a {p} per cent pick accuracy rate',
    'Picked and packed an average of {n} lines per shift using {s2}',
    'Ran {s3} machinery on a three-shift rotation with no lost-time incidents',
    'Supervised a crew of {t} on nights, covering handovers and shift paperwork',
    'Carried out cycle counts and reconciled variances against {s4} records',
    'Completed preventive maintenance schedules on {t} production lines']},
'Admin & Clerical':{
  n:400,rate:[19,34],
  roles:['Administrative Assistant','Executive Assistant','Data Entry Clerk','Receptionist','Office Manager',
    'Accounts Payable Clerk','Payroll Administrator','Customer Service Representative','Scheduling Coordinator',
    'Legal Secretary','HR Assistant','Bookkeeper','Front Desk Coordinator'],
  skills:['Microsoft Excel','Microsoft Word','PowerPoint','Outlook','Pivot Tables','VLOOKUP','Data Entry',
    '10-key','QuickBooks','SAP','Oracle','Salesforce','Calendar Management','Travel Coordination',
    'Minute Taking','Invoicing','Reconciliation','Accounts Payable','Accounts Receivable','ADP','Payroll',
    'Filing','Typing 65 wpm','Switchboard','Expense Reports','Document Control','Records Management','Concur'],
  certs:['Microsoft Office Specialist','Certified Administrative Professional','Notary Public',
    'QuickBooks Certified User','ADP Certified','Certified Payroll Professional'],
  firms:['Ardent Field Services','Pemberton Retail','Whitfield Legal','Cornerstone Insurance',
    'Halcyon Health Group','Northwind Logistics','Berkeley Property Group','Fairlight Media',
    'Stonebridge Accounting','Marlowe Council'],
  bullets:['Managed diaries and travel for {t} senior managers across three sites',
    'Processed an average of {n} invoices per month in {s1} with a {p} per cent first-pass rate',
    'Built and maintained tracking workbooks in {s2}, including pivot reporting for month end',
    'Handled a {n}-call daily switchboard and front desk for a {t}-person office',
    'Ran fortnightly payroll for {n} employees using {s3}',
    'Reorganised the filing and {s4} system ahead of an external audit']},
'Engineering':{
  n:380,rate:[38,88],
  roles:['Mechanical Engineer','Electrical Engineer','Manufacturing Engineer','Process Engineer',
    'Quality Engineer','Design Engineer','Project Engineer','Controls Engineer','Civil Engineer',
    'Structural Engineer','Maintenance Engineer','Industrial Engineer','Reliability Engineer',
    'Validation Engineer','Field Service Engineer','CAD Technician'],
  skills:['AutoCAD','SolidWorks','CATIA','Revit','Creo','GD&T','FEA','ANSYS','MATLAB','PLC',
    'Allen Bradley','Siemens S7','SCADA','HMI','Six Sigma','Root Cause Analysis','FMEA','APQP',
    'PPAP','ISO 9001','ISO 13485','Lean Manufacturing','Kaizen','Tolerance Stack-up','Injection Moulding',
    'CNC Programming','Hydraulics','Pneumatics','Thermodynamics','Finite Element Analysis',
    'Project Scheduling','Primavera P6','Commissioning','Validation Protocols','IQ OQ PQ'],
  certs:['Professional Engineer (PE)','EIT','Six Sigma Black Belt','Six Sigma Green Belt','PMP',
    'Certified Quality Engineer','CSWP SolidWorks','OSHA 30','LEED Green Associate','CMRP'],
  firms:['Ironbark Manufacturing','Halcyon Precision','Corvis Aerospace','Redstone Fabrication',
    'Meridian Controls','Vale Metals','Northgate Engineering','Trellis Components',
    'Copperfield Plastics','Summit Industrial Systems'],
  bullets:['Designed and released {n} part drawings in {s1} to {s2} standards',
    'Led the {s3} programme across {t} production cells, cutting scrap by {p} per cent',
    'Commissioned {t} automated lines using {s4} and brought them to full rate',
    'Ran root cause investigations that lifted first-pass yield to {p} per cent',
    'Owned validation documentation for {t} product families through audit',
    'Reduced changeover time by {p} per cent on a {n}-station assembly line']},
'Finance & Accounting':{
  n:220,rate:[28,72],
  roles:['Staff Accountant','Senior Accountant','Accounts Payable Specialist','Accounts Receivable Clerk',
    'Payroll Manager','Financial Analyst','Credit Controller','Bookkeeper','Cost Accountant',
    'Billing Specialist','Collections Specialist','Assistant Controller','Internal Auditor',
    'Tax Associate'],
  skills:['General Ledger','Month End Close','Journal Entries','Bank Reconciliation','Accruals',
    'Accounts Payable','Accounts Receivable','Fixed Assets','Variance Analysis','Forecasting',
    'Budgeting','SAP FICO','Oracle Financials','NetSuite','QuickBooks','Sage','Xero','Excel Modelling',
    'Pivot Tables','VLOOKUP','Power BI','SOX Compliance','GAAP','IFRS','Multi-currency',
    'Intercompany','Invoice Processing','Credit Control','Payroll Processing','ADP','Concur',
    'Three-way Match','Cash Application'],
  certs:['CPA','ACCA','CIMA','CMA','Certified Payroll Professional','CIA','QuickBooks ProAdvisor',
    'Certified Bookkeeper','SAP FICO Certified'],
  firms:['Stonebridge Accounting','Fairlight Media','Cornerstone Insurance','Berkeley Property Group',
    'Halden Logistics','Vertex Payments','Marlowe Council','Anchor Freight','Cascade Distribution',
    'Lumen Analytics'],
  bullets:['Closed the month in {t} days, down from {n}, across {t} legal entities',
    'Processed {n} invoices a month in {s1} at a {p} per cent first-pass match rate',
    'Rebuilt the {s2} reconciliation, clearing a backlog of {n} open items',
    'Owned {s3} reporting for a {n}m turnover business unit',
    'Reduced debtor days from {n} to {t} through disciplined credit control',
    'Prepared audit schedules and cleared {t} audit queries with no adjustments']},
'Customer Support':{
  n:180,rate:[17,34],
  roles:['Customer Service Representative','Customer Support Specialist','Call Centre Agent',
    'Technical Support Analyst','Service Desk Analyst','Client Services Coordinator',
    'Inbound Sales Agent','Complaints Handler','Team Leader Customer Service',
    'Bilingual Support Agent'],
  skills:['Inbound Calls','Outbound Calls','Zendesk','Freshdesk','Salesforce Service Cloud',
    'ServiceNow','Live Chat','Email Support','Ticket Triage','SLA Management','De-escalation',
    'Complaint Resolution','Order Processing','Returns Processing','CRM Data Entry','Upselling',
    'First Call Resolution','Quality Monitoring','Call Scripting','Knowledge Base Maintenance',
    'Spanish','French','Mandarin','Shift Work','Rostering'],
  certs:['ITIL Foundation','HDI Support Center Analyst','Customer Service Excellence',
    'Zendesk Support Administrator','First Aid'],
  firms:['Pemberton Retail','Vertex Payments','Fairlight Media','Cornerstone Insurance',
    'Linden Park Urgent Care','Anchor Freight','Solstice Labs','Ravenstone IT',
    'Cascade Distribution','Summit Packaging'],
  bullets:['Handled {n} contacts a week across phone, chat and email at {p} per cent CSAT',
    'Resolved {p} per cent of tickets at first contact using {s1}',
    'Held average handling time under {t} minutes on a {n}-call daily queue',
    'Took escalations for a team of {t} and coached on {s2}',
    'Maintained {n} knowledge base articles used across the support floor',
    'Supported customers in two languages on a rotating {t}-shift pattern']},
'Skilled Trades':{
  n:100,rate:[24,58],
  roles:['Electrician','Industrial Electrician','Plumber','HVAC Technician','Millwright','Pipefitter',
    'Diesel Mechanic','Maintenance Technician','Boilermaker','Machinist','Instrumentation Technician'],
  skills:['Conduit Bending','Motor Controls','Three Phase','Panel Wiring','Troubleshooting',
    'Preventive Maintenance','Hydraulics','Pneumatics','Welding','MIG Welding','TIG Welding',
    'Stick Welding','Pipe Threading','Brazing','Refrigeration','EPA 608','Blueprint Reading',
    'Schematics','Lockout Tagout','Confined Space','Rigging','Precision Alignment','Vibration Analysis',
    'CNC Set-up','Lathe','Mill','Calibration'],
  certs:['Journeyman Electrician','Master Electrician','EPA 608 Universal','OSHA 30','NFPA 70E',
    'Certified Welder AWS D1.1','Forklift Certification','Confined Space Trained','Rigging Certified'],
  firms:['Vale Metals','Redstone Fabrication','Ironbark Manufacturing','Ardent Field Services',
    'Summit Industrial Systems','Copperfield Plastics','Halden Logistics','Meridian Controls',
    'Cascade Distribution','Trellis Components'],
  bullets:['Maintained {t} production lines with {p} per cent uptime on a {n}-hour week',
    'Wired and commissioned {t} control panels to {s1} standards',
    'Diagnosed and repaired {n} breakdown callouts with no repeat faults',
    'Carried out planned maintenance on {t} assets using {s2}',
    'Fabricated and installed pipework across {t} plant areas',
    'Held a clean safety record across {n} months of {s3} work']},
'Retail Operations':{
  n:60,rate:[16,32],
  roles:['Store Supervisor','Assistant Store Manager','Store Manager','Merchandiser',
    'Stock Controller','Visual Merchandiser','Department Lead','Cashier Supervisor',
    'Loss Prevention Officer'],
  skills:['Rostering','Shrinkage Control','Visual Merchandising','Planogram','Stock Replenishment',
    'Cash Handling','Till Reconciliation','Customer Service','Team Leading','Sales Targets',
    'Stocktaking','EPOS','Loss Prevention','Health and Safety','Opening and Closing',
    'Recruitment','Onboarding','KPI Reporting'],
  certs:['First Aid','Food Safety Level 2','Health and Safety Level 2','Personal Licence',
    'Loss Prevention Certified'],
  firms:['Pemberton Retail','Fairlight Media','Cornerstone Insurance','Summit Packaging',
    'Berkeley Property Group','Anchor Freight'],
  bullets:['Ran a {n} square foot store with a team of {t} and hit {p} per cent of plan',
    'Cut shrinkage to {p} per cent through tighter {s1} discipline',
    'Built weekly rosters for {t} staff across a seven day trading pattern',
    'Delivered {n} planogram resets on time across {t} departments',
    'Reconciled tills daily with a {p} per cent accuracy record',
    'Recruited and onboarded {t} seasonal staff for peak trading']},
'Healthcare':{
  n:500,rate:[24,72],
  roles:['Registered Nurse','Licensed Practical Nurse','Certified Nursing Assistant','Medical Assistant',
    'Phlebotomist','Medical Records Clerk','Radiologic Technologist','Respiratory Therapist',
    'Pharmacy Technician','Medical Biller','Patient Access Representative','Surgical Technologist',
    'Physical Therapist Assistant'],
  skills:['Patient Care','Vital Signs','IV Insertion','Phlebotomy','EMR','Epic','Cerner','Meditech','HIPAA',
    'Medication Administration','Wound Care','Triage','ICU','Med-Surg','Telemetry','Paediatrics','Geriatrics',
    'Long Term Care','Infection Control','CPT Coding','ICD-10','Medical Terminology','Vaccination',
    'Specimen Collection','Charting','Care Planning','Night Shift','Acute Care','Rehabilitation'],
  certs:['BLS','ACLS','PALS','RN Licence','LPN Licence','CNA Certification','CPR','Phlebotomy Certification',
    'CCMA','ARRT','Certified Pharmacy Technician'],
  firms:['Halcyon Health Group','Cedarline Care Homes','St Alders Hospital','Meadowview Rehabilitation',
    'Riverbend Clinic','Ashford Medical Centre','Grange Park Nursing Home','Beaumont Surgical',
    'Linden Park Urgent Care','Whitmore Paediatrics'],
  bullets:['Carried a caseload of {t} patients per shift on a {n}-bed {s1} unit',
    'Documented care and observations in {s2} to HIPAA standards',
    'Administered medication and monitored {s3} for post-operative patients',
    'Drew and processed an average of {n} specimens per day with a {p} per cent success rate',
    'Coded and submitted claims using {s4} with a {p} per cent clean-claim rate',
    'Covered {t} night shifts per rotation across two sites']}
};

function pick(r,a){return a[Math.floor(r()*a.length)];}
function pickN(r,a,n){
  var c=a.slice(),o=[];
  while(o.length<n&&c.length)o.push(c.splice(Math.floor(r()*c.length),1)[0]);
  return o;
}
function buildCV(r,name,role,vert,loc,skills,certs,years,email,phone){
  var V=VERTICALS[vert];
  var L=[];
  L.push(name.toUpperCase());
  L.push(role+'  |  '+loc+'  |  '+phone+'  |  '+email);
  L.push('');
  L.push('PROFESSIONAL SUMMARY');
  L.push(years+' years of experience as a '+role.toLowerCase()+' in '+vert.toLowerCase()+
    '. Strengths in '+skills.slice(0,3).join(', ')+'. '+
    pick(r,['Available for shift work.','Open to travel within the region.','Seeking a longer-term assignment.',
      'Comfortable in a fast-moving environment.','Looking for a route to a permanent position.'])+
    ' '+pick(r,['Willing to relocate.','Not willing to relocate.','Open to relocation for the right role.']));
  L.push('');
  L.push('KEY SKILLS');
  L.push(skills.join(', '));
  L.push('');
  L.push('EMPLOYMENT HISTORY');
  var end=2026,firms=pickN(r,V.firms,3);
  for(var i=0;i<3;i++){
    var span=1+Math.floor(r()*4),start=end-span;
    if(start<2026-years-2)start=2026-years-2;
    L.push(firms[i]+' — '+(i===0?role:pick(r,V.roles))+'   '+start+'–'+(i===0?'present':String(end)));
    var bl=pickN(r,V.bullets,2);
    bl.forEach(function(b){
      L.push('  - '+b.replace('{s1}',skills[0]||'').replace('{s2}',skills[1]||'')
        .replace('{s3}',skills[2]||'').replace('{s4}',skills[3]||skills[0]||'')
        .replace('{n}',String(10+Math.floor(r()*90)))
        .replace(/\{p\}/g,String(90+Math.floor(r()*10)))
        .replace(/\{t\}/g,String(2+Math.floor(r()*14))));
    });
    end=start;
    L.push('');
  }
  L.push('EDUCATION');
  L.push(pick(r,CV_EDU)+', '+(1998+Math.floor(r()*26)));
  L.push('');
  L.push('CERTIFICATIONS');
  L.push(certs.join(', '));
  return L.join('\n');
}
function generatePool(db){
  var r=rng(20260907),made=0,seenNames={};
  db.candidates.forEach(function(c){seenNames[c.name]=1;});
  Object.keys(VERTICALS).forEach(function(vert){
    var V=VERTICALS[vert];
    for(var i=0;i<V.n;i++){
      var name=pick(r,FIRST2)+' '+pick(r,LAST2);
      var guard=0;
      while(seenNames[name]&&guard++<60)name=pick(r,FIRST2)+' '+pick(r,LAST2);
      if(seenNames[name])continue;
      seenNames[name]=1;
      var role=pick(r,V.roles);
      var loc=pick(r,CV_LOCS);
      var skills=pickN(r,V.skills,5+Math.floor(r()*4));
      var certs=pickN(r,V.certs,1+Math.floor(r()*3));
      var years=1+Math.floor(r()*22);
      var rate=V.rate[0]+Math.floor(r()*(V.rate[1]-V.rate[0]));
      var email=name.toLowerCase().replace(/[^a-z]+/g,'.')+'@mail.example';
      var phone='+1 '+String(201+Math.floor(r()*698))+' '+
        String(1000000+Math.floor(r()*8999999));
      var st=r();
      var status=st<0.06?'Do Not Call':(st<0.12?'Archive':(st<0.30?'New Lead':'Active'));
      var c={id:uid('CD'),name:name,occupation:role,status:status,category:vert,location:loc,
        skills:skills,source:pick(r,CV_SOURCES),desiredRate:rate,availability:pick(r,CV_AVAIL),
        employmentPref:pick(r,['Contract','Contract To Hire','Direct Hire']),relocate:r()<0.4,
        owner:pick(r,['A. Rao','M. Silva','A. Trainee']),added:iso(dOff(-Math.floor(r()*400))),
        phone:phone,email:email,years:years,mine:false,
        cvName:name.replace(/[^A-Za-z]+/g,'_')+'_CV.txt',cvAt:iso(dOff(-Math.floor(r()*300)))};
      c.cv=buildCV(r,name,role,vert,loc,skills,certs,years,email,phone);
      c.certs=certs;
      c.files=[{id:uid('FL'),name:c.cvName,type:'Resume',isResume:true,
        at:new Date(c.cvAt).toISOString(),by:c.owner,text:c.cv}];
      db.candidates.push(c);made++;
    }
  });
  return made;
}

/* ================================================================ boolean search */
function bsTokenize(q){
  var t=[],i=0,s=String(q||'');
  while(i<s.length){
    var ch=s[i];
    if(/\s/.test(ch)){i++;continue;}
    if(ch==='('||ch===')'){t.push({k:ch});i++;continue;}
    var fq=/^([A-Za-z]+):"([^"]*)"/.exec(s.slice(i));
    if(fq){t.push({k:'term',v:fq[2],field:fq[1].toLowerCase(),phrase:true});i+=fq[0].length;continue;}
    if(ch==='"'){
      var j=s.indexOf('"',i+1);
      if(j<0)throw new Error('Unclosed quotation mark. Every phrase needs a closing double quote.');
      t.push({k:'term',v:s.slice(i+1,j),phrase:true});i=j+1;continue;
    }
    if(ch==='-'&&i+1<s.length&&!/\s/.test(s[i+1])){t.push({k:'NOT'});i++;continue;}
    var m=/^[^\s()"]+/.exec(s.slice(i));
    var w=m[0];i+=w.length;
    var U=w.toUpperCase();
    if(U==='AND'||U==='&&'){t.push({k:'AND'});continue;}
    if(U==='OR'||U==='||'){t.push({k:'OR'});continue;}
    if(U==='NOT'){t.push({k:'NOT'});continue;}
    var f=null,v=w,c=w.indexOf(':');
    if(c>0){f=w.slice(0,c).toLowerCase();v=w.slice(c+1);}
    t.push({k:'term',v:v,field:f});
  }
  return t;
}
var BS_FIELDS={name:1,title:1,occupation:1,skills:1,location:1,status:1,source:1,category:1,cv:1,rate:1,availability:1,owner:1};
function bsParse(q){
  var t=bsTokenize(q),p=0;
  function peek(){return t[p];}
  function eat(k){if(t[p]&&t[p].k===k){return t[p++];}return null;}
  function parseOr(){
    var n=parseAnd();
    while(peek()&&peek().k==='OR'){p++;n={op:'OR',l:n,r:parseAnd()};}
    return n;
  }
  function parseAnd(){
    var n=parseNot();
    for(;;){
      if(peek()&&peek().k==='AND'){p++;n={op:'AND',l:n,r:parseNot()};continue;}
      if(peek()&&(peek().k==='term'||peek().k==='('||peek().k==='NOT')){n={op:'AND',l:n,r:parseNot()};continue;}
      break;
    }
    return n;
  }
  function parseNot(){
    if(peek()&&peek().k==='NOT'){p++;return {op:'NOT',l:parseNot()};}
    return parseAtom();
  }
  function parseAtom(){
    if(eat('(')){
      var n=parseOr();
      if(!eat(')'))throw new Error('Unbalanced brackets. Every ( needs a matching ).');
      return n;
    }
    var tk=eat('term');
    if(!tk)throw new Error('Expected a search term'+(peek()?' but found "'+(peek().k)+'"':' at the end of the query')+'.');
    if(tk.field&&!BS_FIELDS[tk.field])
      throw new Error('Unknown field "'+tk.field+'". Try one of: '+Object.keys(BS_FIELDS).join(', ')+'.');
    return {op:'TERM',v:tk.v,field:tk.field||null,phrase:!!tk.phrase};
  }
  if(!t.length)return null;
  var ast=parseOr();
  if(p<t.length)throw new Error('Could not read the whole query. Check the operators around "'+
    (t[p].v||t[p].k)+'".');
  return ast;
}
function bsRegex(term,phrase){
  var esc=String(term).replace(/[.*+?^${}()|[\]\\]/g,function(c){return c==='*'?'*':'\\'+c;});
  esc=esc.replace(/\\\*/g,'*');
  var star=esc.indexOf('*')>=0;
  var body=esc.replace(/\*/g,'[a-z0-9+#._-]*');
  if(phrase)return new RegExp(body.replace(/\s+/g,'\\s+'),'i');
  return new RegExp('(^|[^a-z0-9+#_])'+body+(star?'':'([^a-z0-9+#_]|$)'),'i');
}
function bsHaystack(c,field){
  if(field==='name')return c.name;
  if(field==='title'||field==='occupation')return c.occupation;
  if(field==='skills')return (c.skills||[]).join(' ');
  if(field==='location')return c.location;
  if(field==='status')return c.status;
  if(field==='source')return c.source;
  if(field==='category')return c.category;
  if(field==='cv')return c.cv||'';
  if(field==='rate')return String(c.desiredRate);
  if(field==='availability')return c.availability;
  if(field==='owner')return c.owner||'';
  return [c.name,c.occupation,(c.skills||[]).join(' '),c.location,c.status,c.source,c.category,
    c.availability,c.owner||'',c.cv||''].join(' \u00b7 ');
}
function bsEval(node,c,hits){
  if(!node)return true;
  if(node.op==='TERM'){
    var re=bsRegex(node.v,node.phrase);
    var ok=re.test(bsHaystack(c,node.field));
    if(ok&&hits){var lbl=(node.field?node.field+':':'')+node.v;if(hits.indexOf(lbl)<0)hits.push(lbl);}
    return ok;
  }
  if(node.op==='NOT')return !bsEval(node.l,c,null);
  if(node.op==='AND')return bsEval(node.l,c,hits)&&bsEval(node.r,c,hits);
  if(node.op==='OR'){
    var a=bsEval(node.l,c,hits),b=bsEval(node.r,c,hits);
    return a||b;
  }
  return true;
}
function bsExplain(node){
  if(!node)return 'everything';
  if(node.op==='TERM'){
    var w=node.phrase?'the exact phrase “'+node.v+'”':(node.v.indexOf('*')>=0?'anything starting “'+node.v.replace('*','')+'”':'the whole word “'+node.v+'”');
    return node.field?(w+' in '+node.field):w;
  }
  if(node.op==='NOT')return 'NOT ('+bsExplain(node.l)+')';
  return '('+bsExplain(node.l)+' '+node.op+' '+bsExplain(node.r)+')';
}
function bsSearch(q){
  var ast=bsParse(q);
  var rows=[];
  DB.candidates.forEach(function(c){
    var hits=[];
    if(bsEval(ast,c,hits))rows.push({c:c,hits:hits});
  });
  return {ast:ast,explain:bsExplain(ast),rows:rows};
}

/* ================================================================ local database */
var Store=(function(){
  var NAME='recruitment_ats_sandbox',VER=1,idb=null,timer=null;
  var api={available:false,ready:false,lastSaved:null,reason:'not initialised'};
  function open(){
    return new Promise(function(res,rej){
      var IDB=(typeof window!=='undefined')&&(window.indexedDB||window.mozIndexedDB||window.webkitIndexedDB);
      if(!IDB){rej(new Error('This browser or preview frame does not expose IndexedDB.'));return;}
      var rq;
      try{rq=IDB.open(NAME,VER);}catch(e){rej(e);return;}
      rq.onupgradeneeded=function(){
        var d=rq.result;
        if(!d.objectStoreNames.contains('state'))d.createObjectStore('state');
        if(!d.objectStoreNames.contains('files'))d.createObjectStore('files');
      };
      rq.onsuccess=function(){idb=rq.result;api.available=true;res(idb);};
      rq.onerror=function(){rej(rq.error||new Error('Could not open the local database.'));};
      rq.onblocked=function(){rej(new Error('The local database is blocked by another open tab.'));};
    });
  }
  function tx(store,mode,fn){
    return new Promise(function(res,rej){
      if(!idb){rej(new Error('No database'));return;}
      var t=idb.transaction(store,mode),s=t.objectStore(store),out;
      try{out=fn(s);}catch(e){rej(e);return;}
      t.oncomplete=function(){res(out&&out.result!==undefined?out.result:out);};
      t.onerror=function(){rej(t.error);};
    });
  }
  api.init=function(){
    return open().then(function(){
      return tx('state','readonly',function(s){return s.get('current');});
    }).then(function(rec){
      api.ready=true;api.reason='Local database active';
      return rec||null;
    }).catch(function(e){
      api.available=false;api.ready=true;api.reason=e.message||String(e);
      return null;
    });
  };
  /* Resume text is the bulk of the dataset, so it is stored per candidate rather than
     inside the state record. Only changed resumes are rewritten. */
  var cvDirty={},cvAll=false;
  api.markCV=function(id){cvDirty[id]=true;};
  api.markAllCV=function(){cvAll=true;};
  function stripped(){
    var out={},k;
    for(k in DB){
      if(k==='candidates')continue;
      out[k]=DB[k];
    }
    out.candidates=DB.candidates.map(function(c){
      var copy={},f;
      for(f in c){
        if(f==='cv')continue;
        if(f==='files'){
          copy.files=(c.files||[]).map(function(x){
            var y={},g;for(g in x){if(g!=='text')y[g]=x[g];}return y;});
          continue;
        }
        copy[f]=c[f];
      }
      return copy;
    });
    return out;
  }
  function writeCVs(){
    if(!api.available)return Promise.resolve();
    var ids=cvAll?DB.candidates.map(function(c){return c.id;}):Object.keys(cvDirty);
    if(!ids.length)return Promise.resolve();
    cvAll=false;cvDirty={};
    return tx('files','readwrite',function(st){
      ids.forEach(function(id){
        var c=byId(DB.candidates,id);
        if(!c)return;
        if(c.cv)st.put(c.cv,'cv:'+id);else st.delete('cv:'+id);
      });
    }).catch(function(){});
  }
  api.save=function(force){
    if(!api.available||!api.ready)return;
    if(timer)clearTimeout(timer);
    var run=function(){
      timer=null;
      var payload={savedAt:new Date().toISOString(),version:VER,data:stripped(),seq:SEQ};
      tx('state','readwrite',function(s){return s.put(payload,'current');})
        .then(function(){api.lastSaved=payload.savedAt;return writeCVs();})
        .catch(function(e){api.available=false;api.reason='Save failed: '+(e.message||e);});
    };
    if(force)run();else timer=setTimeout(run,900);
  };
  api.hydrateCVs=function(){
    if(!api.available)return Promise.resolve(0);
    return new Promise(function(res){
      var n=0;
      try{
        var t=idb.transaction('files','readonly'),st=t.objectStore('files');
        var rq=st.openCursor();
        rq.onsuccess=function(){
          var cur=rq.result;
          if(!cur){res(n);return;}
          var k=String(cur.key||'');
          if(k.indexOf('cv:')===0){
            var c=byId(DB.candidates,k.slice(3));
            if(c&&typeof cur.value==='string'){
              c.cv=cur.value;n++;
              (c.files||[]).forEach(function(f){if(f.isResume&&!f.text)f.text=cur.value;});
            }
          }
          cur.continue();
        };
        rq.onerror=function(){res(n);};
      }catch(e){res(n);}
    });
  };
  api.load=function(){
    if(!api.available)return Promise.resolve(null);
    return tx('state','readonly',function(s){return s.get('current');});
  };
  api.clear=function(){
    if(!api.available)return Promise.resolve();
    return tx('state','readwrite',function(s){return s.delete('current');})
      .then(function(){return tx('files','readwrite',function(s){return s.clear();});})
      .then(function(){api.lastSaved=null;});
  };
  api.putFile=function(key,blob){
    if(!api.available)return Promise.resolve();
    return tx('files','readwrite',function(s){return s.put(blob,key);}).catch(function(){});
  };
  api.countFiles=function(){
    if(!api.available)return Promise.resolve(0);
    return tx('files','readonly',function(s){return s.count();}).catch(function(){return 0;});
  };
  return api;
})();

/* ---------------------------------------------------------------- seed */
function seed(){
  SEQ={};
  var db={leads:[],opps:[],companies:[],contacts:[],candidates:[],jobs:[],subs:[],
    appts:[],placements:[],times:[],notes:[],tasks:[],tearsheets:[],savedSearches:[],
    notifs:[],training:true,desk:'d360',permissive:true,blockTimeOnOnboarding:true,parserOverwritePrevention:false,
    uiMode:'redesign',config:defaultConfig(),audit:[],quiz:null,assess:null,tourSeen:false};

  function co(name,cat,owner,status,since){
    var c={id:uid('CL'),name:name,category:cat,owner:owner,status:status,since:since,mine:false,
      employees:['120','450','2,400','60'][db.companies.length%4]};
    db.companies.push(c);return c;
  }
  function ct(co,name,title,primary){
    var c={id:uid('CT'),companyId:co.id,name:name,title:title,status:'Active',owner:co.owner,primary:!!primary,
      email:name.toLowerCase().replace(/[^a-z]+/g,'.')+'@'+co.name.toLowerCase().replace(/[^a-z]+/g,'')+'.example',
      phone:'+1 555 01'+String(20+db.contacts.length),mine:false};
    db.contacts.push(c);return c;
  }
  function jo(co,contact,title,type,openings,filled,pay,bill,loc,owner,opened,status,cat){
    var j={id:uid('JO'),companyId:co.id,contactId:contact.id,title:title,type:type,status:status,
      openings:openings,filled:filled,payRate:pay,billRate:bill,location:loc,owner:owner,
      added:iso(opened),startDate:iso(dOff(14)),duration:'6 months',category:cat,published:false,
      employmentType:(type==='Direct Hire'?'Permanent':'W2'),
      salary:(type==='Direct Hire'?Math.round(bill*2000):0),
      flatFee:(type==='Direct Hire'?Math.round(bill*2000*0.2):0),
      assignedUsers:[owner],
      mine:false,closedReason:null,
      description:'Shift-based role. Client expects two client submissions per week and no unexplained gaps over 60 days.'};
    db.jobs.push(j);return j;
  }
  function ca(name,occ,loc,skills,src,rate,avail,status,cat){
    var c={id:uid('CD'),name:name,occupation:occ,location:loc,skills:skills,source:src,status:status,
      category:cat,desiredRate:rate,availability:avail,owner:'A. Rao',added:iso(dOff(-30)),
      relocate:false,employmentPref:'Contract',mine:false,
      email:name.toLowerCase().replace(/[^a-z]+/g,'.')+'@mail.example',
      phone:'+1 555 07'+String(10+db.candidates.length)};
    db.candidates.push(c);return c;
  }
  function sub(job,cand,status,daysAgo,extra){
    var out=PIPE_OUT.indexOf(status)>=0;
    var via=(extra&&extra.via)||'Internal Submission';
    var ix=out?pIx(via):pIx(status);
    var hist=[];
    for(var i=0;i<=ix;i++)hist.push({status:PIPE_K[i],at:dOff(-(daysAgo+(ix-i)*2+(out?2:0))).toISOString(),by:'A. Rao'});
    if(out)hist.push({status:status,at:dOff(-daysAgo).toISOString(),by:'A. Rao'});
    var s={id:uid('SB'),jobId:job.id,candidateId:cand.id,status:status,owner:'A. Rao',
      added:hist[0].at,modified:dOff(-daysAgo).toISOString(),history:hist,mine:false,
      screenNote:'',summary:'',payRate:null,billRate:null,sentTo:null,sendoutAt:null,
      apptId:null,startDate:null,reason:null};
    if(extra)for(var k in extra)s[k]=extra[k];
    db.subs.push(s);return s;
  }
  function note(action,text,daysAgo,links,who){
    db.notes.push({id:uid('NT'),action:action,text:text,at:dOff(-daysAgo).toISOString(),
      by:who||'A. Rao',links:links,mine:false});
  }

  var c1=co('Northwind Logistics','Light Industrial','A. Rao','Active Client','2023-04-11');
  var c2=co('Halcyon Health Group','Healthcare','A. Rao','Active Client','2024-01-22');
  var c3=co('Pemberton Retail','Retail Operations','M. Silva','Active Client','2025-02-03');
  var c4=co('Ardent Field Services','Admin & Clerical','M. Silva','Prospect','2026-06-15');

  var t1=ct(c1,'Dana Whitfield','Head of Operations',true);
  var t2=ct(c1,'Priya Menon','Warehouse Manager');
  var t3=ct(c2,'Samuel Okoro','Nurse Staffing Lead',true);
  var t4=ct(c2,'Leah Bright','HR Business Partner');
  var t5=ct(c3,'Tomas Berger','Store Operations Manager',true);
  var t6=ct(c4,'Nina Vogel','Contracts Manager',true);

  var j1=jo(c1,t2,'Warehouse Team Lead','Contract',3,0,30,38,'Aurora — East hub','A. Rao',dOff(-34),'Accepting Candidates','Light Industrial');
  var j2=jo(c1,t1,'Fleet Dispatcher','Contract To Hire',1,0,26,32,'Aurora — East hub','A. Rao',dOff(-19),'Accepting Candidates','Light Industrial');
  var j3=jo(c2,t3,'Registered Nurse — nights','Contract',4,0,50,64,'Halcyon Central','A. Rao',dOff(-47),'Covered','Healthcare');
  var j4=jo(c3,t5,'Assistant Store Manager','Direct Hire',2,2,23,29,'Pemberton — North mall','M. Silva',dOff(-61),'Accepting Candidates','Retail Operations');
  var j5=jo(c2,t4,'Medical Records Clerk','Contract',1,0,19,24,'Halcyon Central','M. Silva',dOff(-26),'Accepting Candidates','Admin & Clerical');

  var k1=ca('Marcus Delaney','Warehouse Supervisor','Aurora',['Inventory','Team lead','WMS'],'Referral',36,'2 weeks','Submitted','Light Industrial');
  var k2=ca('Ivy Chandran','Logistics Coordinator','Aurora',['Dispatch','Route planning'],'Job Board',31,'Immediate','Active','Light Industrial');
  var k3=ca('Owen Baptiste','Warehouse Operative','Aurora',['Forklift','Picking'],'Recruiter Outreach',27,'Immediate','Active','Light Industrial');
  var k4=ca('Renata Sol','Registered Nurse','Halcyon',['ICU','Night shift','BLS'],'Referral',62,'4 weeks','Submitted','Healthcare');
  var k5=ca('Peter Nkemelu','Registered Nurse','Halcyon',['Med-surg','Night shift'],'Job Board',60,'Immediate','Submitted','Healthcare');
  var k6=ca('Adaeze Kalu','Registered Nurse','Halcyon',['Paediatrics'],'LinkedIn',65,'Notice period','Active','Healthcare');
  var k7=ca('Sofia Marchetti','Store Supervisor','Pemberton',['Rostering','Shrinkage control'],'Job Board',28,'Immediate','Placed','Retail Operations');
  var k8=ca('Hugo Lindqvist','Records Administrator','Halcyon',['EMR','Data entry'],'Job Board',23,'Immediate','Active','Admin & Clerical');
  var k9=ca('Bea Toussaint','Dispatcher','Aurora',['Fleet','Telematics'],'Referral',33,'1 week','Submitted','Light Industrial');
  var k10=ca('Cyrus Ahmadi','Warehouse Operative','Aurora',['Picking','Stock count'],'Job Board',26,'Immediate','New Lead','Light Industrial');
  var k11=ca('Nadia Farouk','Nurse Practitioner','Halcyon',['Triage','ER'],'Referral',70,'6 weeks','Active','Healthcare');
  var k12=ca('Elliot Kwan','Assistant Manager','Pemberton',['Merchandising','Cash handling'],'Recruiter Outreach',30,'2 weeks','Placed','Retail Operations');

  sub(j1,k1,'Client Submission',9,{screenNote:'Six years supervising a 40-head pick line. Comfortable on nights.',
    summary:'Strong fit for the East hub lead role. Runs shift handovers today and has WMS exposure on two systems.',
    payRate:30,billRate:38,sentTo:t2.id,sendoutAt:dOff(-9).toISOString()});
  sub(j1,k3,'Internal Submission',2,{screenNote:'Operative level, not yet a lead. Parked for the next operative requirement.'});
  sub(j1,k10,'New Lead',1,{});
  sub(j2,k9,'Interview Scheduled',4,{screenNote:'Ran a 12-vehicle desk at her last employer.',
    summary:'Direct fleet dispatch experience, telematics literate, one week notice.',
    payRate:26,billRate:32,sentTo:t1.id,sendoutAt:dOff(-7).toISOString()});
  sub(j2,k2,'Internal Submission',11,{screenNote:'Coordinator background, dispatch adjacent. Needs a rate conversation before we send it.'});
  sub(j3,k4,'Offer Extended',6,{screenNote:'ICU nights, current BLS.',summary:'Cleared client screening criteria.',
    payRate:50,billRate:64,sentTo:t3.id,sendoutAt:dOff(-16).toISOString(),startDate:iso(dOff(14))});
  sub(j3,k5,'Client Submission',13,{screenNote:'Med-surg, open to nights.',
    summary:'Available immediately, med-surg rather than ICU.',payRate:48,billRate:60,sentTo:t3.id,sendoutAt:dOff(-13).toISOString()});
  sub(j3,k6,'Client Declined',8,{screenNote:'Paediatrics only.',reason:'Client requires adult ICU experience.',via:'Client Submission'});
  sub(j5,k8,'Internal Submission',7,{screenNote:'EMR trained, immediate start, wants a permanent route long term.'});
  sub(j4,k7,'Placed',22,{screenNote:'Supervisor with rostering ownership.',summary:'Client accepted on first submission.',
    payRate:23,billRate:29,sentTo:t5.id,sendoutAt:dOff(-30).toISOString(),startDate:iso(dOff(-18))});
  sub(j4,k12,'Placed',35,{screenNote:'Assistant manager, cash handling exposure.',summary:'Second head for the North mall store.',
    payRate:24,billRate:29,sentTo:t5.id,sendoutAt:dOff(-42).toISOString(),startDate:iso(dOff(-33))});

  db.subs.filter(function(s){return s.status==='Interview Scheduled';}).forEach(function(s){
    var j=byId(db.jobs,s.jobId);
    var a={id:uid('AP'),subject:'Client interview — '+byId(db.candidates,s.candidateId).name,
      type:'Interview',at:dOff(1).setHours?new Date(dOff(1).setHours(10,0,0,0)).toISOString():dOff(1).toISOString(),
      duration:45,location:'On site',attendees:'Dana Whitfield',jobId:s.jobId,candidateId:s.candidateId,mine:false};
    db.appts.push(a);s.apptId=a.id;
  });

  db.subs.filter(function(s){return s.status==='Placed';}).forEach(function(s,i){
    var p={id:uid('PL'),jobId:s.jobId,candidateId:s.candidateId,subId:s.id,
      status:'Approved',employmentType:'W2',start:s.startDate,end:iso(dOff(90)),
      payRate:s.payRate,billRate:s.billRate,approvedBy:'M. Silva',mine:false,onboard:{}};
    ONBOARD.forEach(function(o){p.onboard[o.k]=true;});
    if(i===0){p.onboard.bgv=false;p.onboard.payroll=false;}
    db.placements.push(p);
  });

  db.placements.forEach(function(p,i){
    var wks=i===0?[-2,-1]:[-3,-2,-1];
    wks.forEach(function(w,wi){
      db.times.push({id:uid('TE'),placementId:p.id,weekEnding:iso(dOff(w*7)),
        regular:[40,38,40,40][(i+wi)%4],overtime:[0,2,5,0][(i+wi)%4],
        status:(wi===wks.length-1)?'Submitted':'Approved',mine:false,note:''});
    });
  });

  db.leads=[
    {id:uid('LD'),name:'Gregor Halloway',company:'Vantage Cold Chain',title:'Operations Director',
     status:'New Lead',source:'Inbound web',owner:'A. Trainee',added:iso(dOff(-4)),mine:false,
     notes:'Downloaded the shift-coverage guide. 3 sites, 200 heads, uses two agencies today.'},
    {id:uid('LD'),name:'Marisol Reyes',company:'Cedarline Care Homes',title:'Regional Manager',
     status:'In Process',source:'Referral',owner:'A. Trainee',added:iso(dOff(-11)),mine:false,
     notes:'Referred by Samuel at Halcyon. Wants night cover across four homes from next quarter.'}
  ];
  db.opps=[
    {id:uid('OP'),title:'Night cover framework — 4 homes',companyId:c4.id,contactId:t6.id,
     type:'Contract',status:'Open',value:180000,probability:40,closeDate:iso(dOff(30)),owner:'A. Trainee',mine:false}
  ];

  db.tearsheets=[
    {id:uid('TR'),name:'Aurora nights — cleared operatives',description:'Screened and available for East hub night shifts.',
     owner:'A. Rao',candidateIds:[k1.id,k3.id,k10.id],mine:false}
  ];

  note('Outbound Call','Quarterly review with Dana. Two more lead roles expected next month.',5,{companyId:c1.id,contactId:t1.id});
  note('Email','Sent updated rate card for night-shift nursing.',3,{companyId:c2.id,contactId:t3.id});
  note('Client Visit','Store walk-through with Tomas. Flagged rostering gaps.',12,{companyId:c3.id,contactId:t5.id});
  note('Internal Memo','Prospect. Contract terms under review by their legal team.',20,{companyId:c4.id});
  note('Prescreen','Confirmed availability and travel radius.',9,{candidateId:k1.id,jobId:j1.id});
  note('Outbound Call','Talked through the offer. Wants a 14-day start runway.',6,{candidateId:k4.id,jobId:j3.id});
  note('Left Message','Left voicemail. No response yet.',11,{candidateId:k2.id});
  note('Inbound Call','Client chased on submission volume. Two per week agreed.',2,{jobId:j3.id,companyId:c2.id,contactId:t3.id});

  db.tasks=[
    {id:uid('TK'),subject:'Chase client feedback on the East hub lead sendout',due:iso(dOff(0)),
     priority:'High',owner:'A. Trainee',entity:'JO-1001',done:false,mine:false},
    {id:uid('TK'),subject:'Confirm interview logistics with the dispatcher candidate',due:iso(dOff(1)),
     priority:'Medium',owner:'A. Trainee',entity:'JO-1002',done:false,mine:false},
    {id:uid('TK'),subject:'Collect outstanding onboarding documents for the North mall placement',due:iso(dOff(-2)),
     priority:'High',owner:'A. Trainee',entity:'PL-1000',done:false,mine:false}
  ];
  generatePool(db);
  /* The hand-written candidates need CVs too: a client submission is refused without one,
     so a seeded desk with no CVs would be unworkable. */
  (function(){
    var r=rng(19870423);
    db.candidates.forEach(function(c){
      if(c.cv)return;
      var vert=VERTICALS[c.category]?c.category:'Light Industrial';
      var certs=pickN(r,VERTICALS[vert].certs,2);
      var years=3+Math.floor(r()*18);
      c.years=c.years||years;
      c.cv=buildCV(r,c.name,c.occupation,vert,c.location,c.skills,certs,c.years,c.email,c.phone);
      c.cvName=c.name.replace(/[^A-Za-z]+/g,'_')+'_CV.txt';
      c.cvAt=iso(dOff(-Math.floor(r()*120)));
      c.files=[{id:uid('FL'),name:c.cvName,type:'Resume',isResume:true,
        at:new Date(c.cvAt).toISOString(),by:c.owner||'A. Rao',text:c.cv}];
    });
  })();
  return db;
}

/* ---------------------------------------------------------------- state */
var DB=seed();
var route={view:'dashboard',id:null,tab:null};
var openTabs=[];
var coachOpen=false, menuOpen=false, activeScenario='s1';
var railMini=false, coachMini=true;
try{
  if(typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(max-width: 1100px)').matches){
    railMini=true;
  }
}catch(e){}
var SEEN={reports:false};

function log(action,detail){
  DB.audit.unshift({id:uid('AU'),at:new Date().toISOString(),by:'A. Trainee',action:action,detail:detail||''});
}
function toast(msg,kind){
  var d=document.createElement('div');
  d.className='toast '+(kind||'');d.textContent=msg;
  document.getElementById('toasts').appendChild(d);
  setTimeout(function(){d.remove();},3200);
}

/* ---------------------------------------------------------------- derived */
var jobSubs=function(id){return DB.subs.filter(function(s){return s.jobId===id;});};
var candSubs=function(id){return DB.subs.filter(function(s){return s.candidateId===id;});};
var coContacts=function(id){return DB.contacts.filter(function(c){return c.companyId===id;});};
var coJobs=function(id){return DB.jobs.filter(function(j){return j.companyId===id;});};
var notesFor=function(key,id){return DB.notes.filter(function(n){return n.links&&n.links[key]===id;})
  .sort(function(a,b){return new Date(b.at)-new Date(a.at);});};
var jobName=function(id){var j=byId(DB.jobs,id);return j?j.title:'—';};
var candName=function(id){var c=byId(DB.candidates,id);return c?c.name:'—';};
var coName=function(id){var c=byId(DB.companies,id);return c?c.name:'—';};
var ctName=function(id){var c=byId(DB.contacts,id);return c?c.name:'—';};
var openJobs=function(){return DB.jobs.filter(function(j){
  return ['Accepting Candidates','Covered'].indexOf(j.status)>=0;});};
var addableJobs=function(){return DB.jobs.filter(function(j){
  return ['Closed','Cancelled'].indexOf(j.status)<0;});};
var liveSubs=function(){return DB.subs.filter(function(s){
  return PIPE_OUT.indexOf(s.status)<0 && s.status!=='Placed';});};
var pendingTime=function(){return DB.times.filter(function(t){return t.status==='Submitted';});};
var pendingPlacements=function(){return DB.placements.filter(function(p){return p.status==='Pending Approval';});};
var onboardGaps=function(){return DB.placements.filter(function(p){
  return ONBOARD.some(function(o){return !p.onboard[o.k];});});};
var staleSubs=function(){return liveSubs().filter(function(s){
  return daysBetween(s.modified,new Date())>=5;});};
var sendouts=function(){return DB.subs.filter(function(s){return !!s.sendoutAt;});};
function funnel(subs){
  var out={};PIPE_K.forEach(function(k){out[k]=0;});
  PIPE_OUT.forEach(function(k){out[k]=0;});
  subs.forEach(function(s){
    var reached=s.history.map(function(h){return h.status;});
    PIPE_K.forEach(function(k){if(reached.indexOf(k)>=0)out[k]++;});
    if(PIPE_OUT.indexOf(s.status)>=0)out[s.status]++;
  });
  return out;
}
function timeToFill(){
  var v=[];
  DB.subs.filter(function(s){return s.status==='Placed';}).forEach(function(s){
    var j=byId(DB.jobs,s.jobId);
    var at=(s.history.filter(function(h){return h.status==='Placed';})[0]||{}).at;
    if(j&&at)v.push(daysBetween(j.added,at));
  });
  return v.length?Math.round(v.reduce(function(a,b){return a+b;},0)/v.length):null;
}
function markup(p,b){return p?Math.round((b-p)/p*100):0;}
/* C1: margin bands. 20%+ normal, 10 to under 20 needs a manager, under 10 is refused. */
var MARGIN_OK=20,MARGIN_FLOOR=10;
function marginBand(pay,bill,rec){
  /* A permanent placement has no hourly margin. It is judged on the fee against the salary. */
  if(rec&&rec.perm){
    var fp=rec.salary?(rec.flatFee/rec.salary*100):0;
    if(fp<10)return {k:'block',m:fp,t:'a fee of under 10 per cent of salary'};
    if(fp<15)return {k:'review',m:fp,t:'a fee between 10 and 15 per cent of salary, so it needs a manager'};
    return {k:'ok',m:fp,t:'a fee at or above 15 per cent of salary'};
  }
  var m=(bill&&pay)?((bill-pay)/bill*100):0;
  if(m<MARGIN_FLOOR)return {k:'block',m:m,t:'below the '+MARGIN_FLOOR+'% floor'};
  if(m<MARGIN_OK)return {k:'review',m:m,t:'between '+MARGIN_FLOOR+'% and '+MARGIN_OK+'%, so it needs a manager'};
  return {k:'ok',m:m,t:'at or above '+MARGIN_OK+'%'};
}
function marginPill(pay,bill){
  var b=marginBand(pay,bill);
  var cls=b.k==='ok'?'p-good':(b.k==='review'?'p-warn':'p-bad');
  return '<span class="pill '+cls+'">'+Math.round(b.m)+'%</span>';
}
function margin(p,b){return b?Math.round((b-p)/b*100):0;}

/* ---------------------------------------------------------------- tabs */
function pushTab(type,id,label){
  if(!id)return;
  openTabs=openTabs.filter(function(t){return t.id!==id;});
  openTabs.unshift({type:type,id:id,label:label});
  if(openTabs.length>6)openTabs.length=6;
}
var TAB_TYPE={company:'Company',contact:'Contact',candidate:'Candidate',job:'Job Order',
  placement:'Placement',tearsheet:'Tearsheet',lead:'Lead',opp:'Opportunity'};
function renderTabs(){ renderRail(); }

/* ---------------------------------------------------------------- actions */
var A={};

A.actions=function(type,id){
  var items=[];
  if(type==='candidate'){
    var c=byId(DB.candidates,id);
    items=[['Add to a pipeline','pipeline-add',id,'data-cand'],
      ['Add a Task','task-for',id],
      ['Schedule an Appointment','appt-for',id],
      ['Send the resume to a contact','send-resume',id],
      [c&&c.cv?'Replace CV':'Upload CV','upload-cv',id],
      ['Email this candidate','email-cand',id],
      ['Add to a Tearsheet','tearsheet-add',id],
      ['Edit this candidate','edit-candidate',id],
      ['Add a Note','note',id,'data-candidateid']];
  } else if(type==='job'){
    var j=byId(DB.jobs,id);
    items=[['Add a candidate to the pipeline','pipeline-add',id],
      ['Add a Task','task-for-job',id],
      ['Schedule an Appointment','appt-for-job',id],
      ['Create a new candidate','add-candidate',id],
      ['Find candidates','match-job',id],
      [j&&j.published?'Unpublish from the careers site':'Publish to the careers site','publish',id],
      ['Email the client contact','email-client',id],
      ['Change the status','job-status',id],
      ['Edit this job order','edit-job',id],
      ['Add a Note','note',id,'data-jobid']];
  } else if(type==='company'){
    items=[['Add a Job Order','add-job',id],
      ['Add a Contact','add-contact',id],
      ['Add an Opportunity','add-opp',id],
      ['Edit this company','edit-company',id],
      ['Add a Note','note',id,'data-companyid']];
  } else if(type==='placement'){
    items=[['Add a time entry','time-add',id],
      ['Approve the placement','approve-pl',id],
      ['Edit this placement','edit-placement',id],
      ['Add a Note','note',id,'data-candidateid']];
  }
  var root=document.getElementById('modal-root');
  root.innerHTML='<div class="scrim" data-scrim><div class="modal" style="width:min(380px,100%)" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>Actions</h4></div>'+
    '<div class="modal-b" style="padding:8px 0">'+items.map(function(it){
      return '<a class="lnk" style="display:block;padding:9px 16px;border-bottom:1px solid var(--line2);'+
        'font-weight:500" data-runact="'+it[1]+'" data-runid="'+esc(it[2])+'" '+
        'data-runattr="'+(it[3]||'')+'" role="button" tabindex="0">'+esc(it[0])+'</a>';
    }).join('')+'</div>'+
    '<div class="modal-f"><button class="btn ghost" data-close>Cancel</button></div></div></div>';
  root.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('click',function(){root.innerHTML='';});});
  root.querySelectorAll('[data-runact]').forEach(function(b){
    b.addEventListener('click',function(){
      var a=b.getAttribute('data-runact'),rid=b.getAttribute('data-runid'),at=b.getAttribute('data-runattr');
      root.innerHTML='';
      if(a==='note'){
        var pre={};
        if(at==='data-candidateid')pre.candidateId=rid;
        if(at==='data-jobid')pre.jobId=rid;
        if(at==='data-companyid')pre.companyId=rid;
        A.addNote(pre);return;
      }
      if(a==='pipeline-add'&&at==='data-cand'){A.addToPipeline(null,rid);return;}
      ({'pipeline-add':function(){A.addToPipeline(rid);},'upload-cv':function(){A.uploadCV(rid);},
        'tearsheet-add':function(){A.addToTearsheet(rid);},'edit-candidate':function(){A.editCandidate(rid);},
        'add-candidate':function(){A.addCandidate(rid);},'match-job':function(){A.matchJob?A.matchJob(rid):A.jobSearch(rid);},
        'publish':function(){A.publishJob(rid);},'job-status':function(){A.setJobStatus(rid);},
        'edit-job':function(){A.editJob(rid);},'add-job':function(){A.addJob(rid);},
        'add-contact':function(){A.addContact(rid);},'add-opp':function(){A.addOpp(rid);},
        'edit-company':function(){A.editCompany(rid);},'time-add':function(){A.addTime(rid);},
        'email-cand':function(){A.email({to:'candidate',candidateId:rid});},
        'task-for':function(){A.addTask({candidateId:rid});},
        'task-for-job':function(){A.addTask({jobId:rid});},
        'appt-for':function(){A.addAppointment({candidateId:rid});},
        'appt-for-job':function(){A.addAppointment({jobId:rid});},
        'send-resume':function(){A.sendResume(rid);},
        'email-client':function(){A.email({to:'contact',jobId:rid});},
        'approve-pl':function(){A.approvePlacement(rid);},'edit-placement':function(){A.editPlacement(rid);}
      }[a]||function(){})();
    });
  });
  root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
    if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
};
A.addNew=function(){
  var opts=[
    ['Lead','lead'],['Opportunity','opp'],['Company','company'],['Contact','contact'],
    ['Candidate','candidate'],['Job Order','job'],['Note','note'],['Task','task'],['Tearsheet','tearsheet']
  ];
  var root=document.getElementById('modal-root');
  root.innerHTML='<div class="scrim" data-scrim><div class="modal" style="width:min(420px,100%)" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>Add New</h4><p>Records can be created from here or from the record they belong to. Creating from the parent record pre-fills the association.</p></div>'+
    '<div class="modal-b" style="padding:8px 0">'+opts.map(function(o){
      return '<a class="lnk" style="display:block;padding:9px 16px;border-bottom:1px solid var(--line2);font-weight:500" data-new="'+o[1]+'" role="button" tabindex="0">'+esc(o[0])+'</a>';
    }).join('')+'</div>'+
    '<div class="modal-f"><button class="btn ghost" data-close>Cancel</button></div></div></div>';
  root.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',function(){root.innerHTML='';});});
  root.querySelectorAll('[data-new]').forEach(function(b){
    b.addEventListener('click',function(){
      var k=b.getAttribute('data-new');root.innerHTML='';
      ({lead:A.addLead,opp:A.addOpp,company:A.addCompany,contact:A.addContact,candidate:A.addCandidate,
        job:A.addJob,note:function(){A.addNote({});},task:A.addTask,tearsheet:A.addTearsheet})[k]();
    });
  });
  root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
    if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
};

A.addLead=function(){
  openForm({title:'Add Lead',
    intro:'A lead is an unqualified sales enquiry. It carries no job order and no submissions until it is converted into a company and contact.',
    fields:[
      {k:'name',label:'Lead name',type:'text',required:true},
      {k:'company',label:'Company',type:'text',required:true,hint:'Free text at lead stage. It becomes a company record on conversion.'},
      {k:'title',label:'Title',type:'text',required:true},
      {k:'source',label:'Source',type:'select',required:true,options:['Inbound web','Referral','Outbound call','Event','Job Board']},
      {k:'notes',label:'Qualification notes',type:'textarea',required:true,min:30,
        hint:'Headcount, sites, incumbent agencies, trigger event. At least 30 characters.'}
    ],
    submit:'Save Lead',
    onSubmit:function(v){
      var l={id:uid('LD'),name:v.name,company:v.company,title:v.title,status:'New Lead',source:v.source,
        owner:'A. Trainee',added:iso(TODAY),notes:v.notes,mine:true};
      DB.leads.push(l);
      log('Added Lead',l.name+' · '+l.company);
      toast('Lead saved','ok');go('lead',l.id);
    }});
};

A.convertLead=function(id){
  var l=byId(DB.leads,id);
  if(l.status==='Converted'){toast('This lead is already converted','no');return;}
  openForm({title:'Convert Lead',
    intro:'Conversion creates a company and a contact, and optionally an opportunity. The lead is retained as the origin record so the source is not lost.',
    note:l.name+' · '+l.company,
    fields:[
      {k:'coName',label:'Company name',type:'text',required:true,value:l.company},
      {k:'category',label:'Category',type:'select',required:true,options:CATEGORIES},
      {k:'coStatus',label:'Company status',type:'select',required:true,options:CO_STATUS,value:'Prospect'},
      {k:'ctName',label:'Contact name',type:'text',required:true,value:l.name},
      {k:'ctTitle',label:'Contact title',type:'text',required:true,value:l.title},
      {k:'email',label:'Contact email',type:'text',required:true},
      {k:'phone',label:'Contact phone',type:'text',required:true},
      {k:'makeOpp',label:'Also create an opportunity for the expected requirement',type:'check'}
    ],
    validate:function(v){var e={};if(v.email&&v.email.indexOf('@')<0)e.email='Enter a full email address.';return e;},
    submit:'Convert Lead',
    onSubmit:function(v){
      var c={id:uid('CL'),name:v.coName,category:v.category,owner:'A. Trainee',status:v.coStatus,
        since:iso(TODAY),employees:'—',mine:true};
      DB.companies.push(c);
      var t={id:uid('CT'),companyId:c.id,name:v.ctName,title:v.ctTitle,status:'Active',owner:'A. Trainee',
        primary:true,email:v.email,phone:v.phone,mine:true};
      DB.contacts.push(t);
      l.status='Converted';l.companyId=c.id;l.contactId=t.id;
      log('Converted Lead',l.name+' → '+c.name+' / '+t.name);
      if(v.makeOpp){
        var o={id:uid('OP'),title:'Requirement from '+c.name,companyId:c.id,contactId:t.id,type:'Contract',
          status:'Open',value:60000,probability:30,closeDate:iso(dOff(30)),owner:'A. Trainee',mine:true};
        DB.opps.push(o);
        log('Added Opportunity',o.title);
        toast('Lead converted, opportunity created','ok');go('opp',o.id);return;
      }
      toast('Lead converted','ok');go('company',c.id);
    }});
};

A.addOpp=function(companyId){
  if(!DB.companies.length){toast('No company to attach an opportunity to','no');return;}
  var cos=DB.companies.filter(function(c){return coContacts(c.id).length;});
  if(!cos.length){toast('No company has a contact yet','no');return;}
  openForm({title:'Add Opportunity',
    intro:'An opportunity is a forecastable requirement that has not yet been released as a job order. It carries value and probability so the desk can be forecast.',
    fields:[
      {k:'companyId',label:'Company',type:'select',required:true,value:companyId||cos[0].id,reRender:true,
        options:cos.map(function(c){return {v:c.id,t:c.name};})},
      {k:'contactId',label:'Contact',type:'select',required:true,
        optionsFrom:function(v){return coContacts(v.companyId).map(function(c){return {v:c.id,t:c.name+' · '+c.title};});}},
      {k:'title',label:'Opportunity title',type:'text',required:true},
      {k:'type',label:'Type',type:'select',required:true,options:JO_TYPE},
      {k:'value',label:'Estimated annual value',type:'number',required:true,minNum:1},
      {k:'probability',label:'Probability %',type:'number',required:true,minNum:0,value:40},
      {k:'closeDate',label:'Expected close date',type:'date',required:true,value:iso(dOff(30))}
    ],
    submit:'Save Opportunity',
    onSubmit:function(v){
      var o={id:uid('OP'),title:v.title,companyId:v.companyId,contactId:v.contactId,type:v.type,status:'Open',
        value:Number(v.value),probability:Number(v.probability),closeDate:v.closeDate,owner:'A. Trainee',mine:true};
      DB.opps.push(o);
      log('Added Opportunity',o.title+' · '+coName(o.companyId));
      toast('Opportunity saved','ok');go('opp',o.id);
    }});
};

A.convertOpp=function(id){
  var o=byId(DB.opps,id);
  if(o.status!=='Open'){toast('Only an open opportunity can be converted','no');return;}
  A.addJob(o.companyId,o);
};

A.addCompany=function(){
  openForm({title:'Add Company',entity:'company',
    intro:'The company is the parent record. Contacts, job orders and placements all hang off it, so the name, owner and status must be right the first time.',
    fields:[
      {k:'name',label:'Company name',type:'text',required:true,hint:'Legal trading name, not an abbreviation.'},
      {k:'category',label:'Category',type:'select',required:true,options:CATEGORIES},
      {k:'status',label:'Status',type:'select',required:true,options:CO_STATUS,
        hint:'Prospect until the first job order is signed. Status drives who chases it.'},
      {k:'owner',label:'Owner',type:'select',required:true,options:['A. Trainee','A. Rao','M. Silva']},
      {k:'employees',label:'Number of employees',type:'text',required:false}
    ],
    submit:'Save Company',
    onSubmit:function(v){
      var c={id:uid('CL'),name:v.name,category:v.category,status:v.status,owner:v.owner,
        since:iso(TODAY),employees:v.employees||'—',mine:true};
      DB.companies.push(c);
      log('Added Company',c.name+' ('+c.id+')');
      toast('Company saved','ok');go('company',c.id);
    }});
};

A.addContact=function(companyId){
  if(!DB.companies.length){toast('Add a company first','no');return;}
  openForm({title:'Add Contact',entity:'contact',
    intro:'A job order cannot be raised without a named contact. This is the person who receives sendouts and gives feedback.',
    fields:[
      {k:'companyId',label:'Company',type:'select',required:true,value:companyId||'',
        options:DB.companies.map(function(c){return {v:c.id,t:c.name};})},
      {k:'name',label:'Contact name',type:'text',required:true},
      {k:'title',label:'Title',type:'text',required:true,hint:'Decision maker or gatekeeper. It changes how you chase feedback.'},
      {k:'phone',label:'Phone',type:'text',required:true},
      {k:'email',label:'Email',type:'text',required:true},
      {k:'primary',label:'Primary contact for this company',type:'check'}
    ],
    validate:function(v){var e={};if(v.email&&v.email.indexOf('@')<0)e.email='Enter a full email address.';return e;},
    submit:'Save Contact',
    onSubmit:function(v){
      var c={id:uid('CT'),companyId:v.companyId,name:v.name,title:v.title,status:'Active',owner:'A. Trainee',
        primary:!!v.primary,phone:v.phone,email:v.email,mine:true};
      DB.contacts.push(c);
      log('Added Contact',c.name+' at '+coName(c.companyId));
      toast('Contact saved','ok');go('contact',c.id);
    }});
};

A.addJob=function(companyId,fromOpp){
  var cos=DB.companies.filter(function(c){return coContacts(c.id).length;});
  if(!cos.length){toast('No company has a contact yet','no');return;}
  var pick=companyId&&coContacts(companyId).length?companyId:cos[0].id;
  openForm({title:fromOpp?'Convert Opportunity to Job Order':'Add Job Order',entity:'jobOrder',
    intro:fromOpp
      ?'Converting carries the company, contact and type across. The opportunity closes as Won so the forecast and the live requirement do not double count.'
      :'The job order is the unit of work. Type, openings and rates drive coverage, margin and every downstream report.',
    fields:[
      {k:'companyId',label:'Company',type:'select',required:true,value:pick,reRender:true,
        options:cos.map(function(c){return {v:c.id,t:c.name};})},
      {k:'contactId',label:'Contact',type:'select',required:true,
        optionsFrom:function(v){return coContacts(v.companyId).map(function(c){return {v:c.id,t:c.name+' · '+c.title};});},
        hint:'Sendouts go to this person.'},
      {k:'title',label:'Job title',type:'text',required:true,value:fromOpp?fromOpp.title:'',
        hint:'Use the client\u2019s own title, not an internal shorthand.'},
      {k:'type',label:'Job order type',type:'select',required:true,options:JO_TYPE,
        value:fromOpp?fromOpp.type:'Contract',reRender:true,
        hint:'Contract and Contract To Hire are rate based. Direct Hire is fee based and has no timesheets.'},
      {k:'category',label:'Category',type:'select',required:true,options:CATEGORIES},
      {k:'openings',label:'Openings',type:'number',required:true,value:1,minNum:1},
      {k:'employmentType',label:'Employment type',type:'select',required:true,
        optionsFrom:function(v){return EMP_BY_TYPE[v.type]||EMP_TYPE;},
        hint:'Permanent applies to a direct hire; contract work is W2, 1099 or Corp to Corp.'},
      {k:'payRate',label:'Pay rate per hour',type:'number',minNum:1,
        hint:'Contract and contract to hire only.'},
      {k:'billRate',label:'Bill rate per hour',type:'number',minNum:1,
        hint:'Contract and contract to hire only.'},
      {k:'salary',label:'Salary',type:'number',minNum:1,hint:'Direct hire only.'},
      {k:'flatFee',label:'Flat fee',type:'number',minNum:1,
        hint:'Direct hire only. The fee invoiced on placement.'},
      {k:'location',label:'Location',type:'text',required:true},
      {k:'startDate',label:'Anticipated start date',type:'date',required:true,value:iso(dOff(21))},
      {k:'description',label:'Job description',type:'textarea',required:true,min:40,
        hint:'Must-haves, deal breakers, shift pattern. At least 40 characters. A thin description is the commonest cause of declined sendouts.'}
    ],
    validate:function(v){
      var e={};
      if(v.type==='Direct Hire'){
        if(!v.salary)e.salary='HARD STOP: a direct hire needs a salary. There are no hourly rates to bill against.';
        else if(!v.flatFee)e.flatFee='A direct hire needs a flat fee, otherwise the placement cannot be invoiced.';
      } else {
        if(!v.payRate)e.payRate='HARD STOP: contract work needs a pay rate.';
        else if(!v.billRate)e.billRate='HARD STOP: contract work needs a bill rate.';
        else if(Number(v.billRate)<=Number(v.payRate))
          e.billRate='HARD STOP: bill rate must exceed pay rate, otherwise the job order carries no margin.';
      }
      return e;
    },
    submit:fromOpp?'Convert to Job Order':'Save Job Order',
    onSubmit:function(v){
      var j={id:uid('JO'),companyId:v.companyId,contactId:v.contactId,title:v.title,type:v.type,
        category:v.category,status:'Accepting Candidates',openings:Number(v.openings),filled:0,
        employmentType:v.employmentType,
        payRate:Number(v.payRate)||0,billRate:Number(v.billRate)||0,
        salary:Number(v.salary)||0,flatFee:Number(v.flatFee)||0,
        location:v.location,owner:'A. Trainee',assignedUsers:['A. Trainee'],
        added:iso(TODAY),startDate:v.startDate,duration:'6 months',published:false,
        description:v.description,mine:true,closedReason:null};
      DB.jobs.push(j);
      log('Added Job Order',j.title+' · '+coName(j.companyId));
      if(fromOpp){
        fromOpp.status='Won';fromOpp.jobId=j.id;
        log('Opportunity won',fromOpp.title);
      }
      toast('Job order saved','ok');go('job',j.id);
    }});
};

A.publishJob=function(id){
  var j=byId(DB.jobs,id);
  j.published=!j.published;
  log(j.published?'Published job order':'Unpublished job order',j.title);
  toast(j.published?'Published to the careers site':'Removed from the careers site',j.published?'ok':'');
  render();
};

A.setJobStatus=function(id){
  var j=byId(DB.jobs,id);
  var subs=jobSubs(id);
  var live=subs.filter(function(s){return PIPE_OUT.indexOf(s.status)<0&&s.status!=='Placed';});
  openForm({title:'Change job order status',
    intro:'Status is the single field operations managers read first. Accepting Candidates means you still need names. Covered means the client has enough to decide on. Filled means every opening is consumed.',
    note:j.title+' · '+j.filled+' of '+j.openings+' filled · '+live.length+' live on the pipeline',
    fields:[
      {k:'status',label:'Status',type:'select',required:true,options:JO_STATUS,value:j.status},
      {k:'reason',label:'Reason',type:'textarea',required:true,min:20,
        hint:'Recorded as a note on the job order. This is what an audit reads.'},
      {k:'ack',label:'I understand that closing or cancelling withdraws the '+live.length+' live candidate(s) as Not Proceeding',type:'check'}
    ],
    validate:function(v){
      var e={};
      var closing=['Closed','Cancelled'].indexOf(v.status)>=0;
      if(closing&&live.length&&!v.ack)e.ack='You must acknowledge this before closing.';
      if(v.status==='Filled'&&j.filled<j.openings)e.status='Only '+j.filled+' of '+j.openings+' openings are placed. Filled would misstate coverage.';
      return e;
    },
    submit:'Update status',
    onSubmit:function(v){
      j.status=v.status;j.closedReason=v.reason;
      if(['Closed','Cancelled'].indexOf(v.status)>=0){
        live.forEach(function(s){
          s.status='Not Proceeding';s.reason='Job order '+v.status.toLowerCase()+': '+v.reason;
          s.modified=new Date().toISOString();
          s.history.push({status:'Not Proceeding',at:s.modified,by:'A. Trainee'});
        });
      }
      DB.notes.push({id:uid('NT'),action:'Other',text:'Status changed to '+v.status+'. '+v.reason,
        at:new Date().toISOString(),by:'A. Trainee',links:{jobId:j.id,companyId:j.companyId},mine:true});
      log('Job order status → '+v.status,j.title);
      toast('Status updated','ok');render();
    }});
};

function digits(x){return String(x||'').replace(/\D+/g,'');}
function dupCheck(v,selfId){
  var name=String(v.name||'').trim().toLowerCase();
  var mail=String(v.email||'').trim().toLowerCase();
  var ph=digits(v.phone);
  var loc=String(v.location||'').trim().toLowerCase();
  var hit=null;
  DB.candidates.forEach(function(c){
    if(hit||c.id===selfId)return;
    if(mail&&String(c.email||'').trim().toLowerCase()===mail)
      hit={field:'email',why:'the same email address',c:c};
    else if(ph&&ph.length>=7&&digits(c.phone)===ph)
      hit={field:'phone',why:'the same phone number',c:c};
    else if(name&&c.name.trim().toLowerCase()===name){
      if(loc&&String(c.location||'').trim().toLowerCase()===loc)
        hit={field:'name',why:'the same name and location',c:c};
      else hit={field:'name',why:'the same name',c:c};
    }
  });
  if(!hit)return null;
  hit.msg='Possible duplicate: '+hit.c.name+' ('+hit.c.id+') already has '+hit.why+
    '. Open that record and add to it rather than creating a second one. '+
    'Duplicates split the activity history and double count every ratio built on candidate volume.';
  return hit;
}
A.addCandidate=function(jobId){
  openForm({title:'Add Candidate',entity:'candidate',
    intro:'Duplicate candidate records split activity history and corrupt every ratio built on candidate volume. Check before you create.',
    fields:[
      {k:'name',label:'Name',type:'text',required:true},
      {k:'occupation',label:'Occupation',type:'text',required:true,hint:'Current or most recent job title.'},
      {k:'status',label:'Status',type:'select',required:true,options:CD_STATUS,value:'New Lead',
        hint:'New Lead until you have spoken to them. Do Not Call and Archive remove them from searches.'},
      {k:'category',label:'Category',type:'select',required:true,options:CATEGORIES},
      {k:'location',label:'Location',type:'text',required:true},
      {k:'skills',label:'Primary skills',type:'text',required:true,hint:'Comma separated. This is what you will search on later.'},
      {k:'source',label:'Source',type:'select',required:true,options:CD_SOURCES,
        hint:'Source is a reportable metric. Guessing corrupts it.'},
      {k:'desiredRate',label:'Desired pay rate per hour',type:'number',minNum:1,
        softRequired:'No rate expectation recorded. Left blank it is stored as no value rather '+
          'than as zero, and the check that stops you submitting below expectation cannot fire.'},
      {k:'availability',label:'Availability',type:'select',required:true,options:['Immediate','1 week','2 weeks','4 weeks','Notice period']},
      {k:'employmentPref',label:'Employment preference',type:'select',required:true,options:JO_TYPE},
      {k:'phone',label:'Phone',type:'text',
        softRequired:'No phone number. You cannot screen someone you cannot reach.'},
      {k:'email',label:'Email',type:'text',
        softRequired:'No email address. Sendouts and confirmations have nowhere to go.'}
    ],
    validate:function(v){
      var e={};
      if(v.email&&v.email.indexOf('@')<0)e.email='Enter a full email address.';
      var d=dupCheck(v,null);
      if(d)e[d.field]=d.msg;
      return e;
    },
    submit:'Save Candidate',
    onSubmit:function(v){
      var c={id:uid('CD'),name:v.name,occupation:v.occupation,status:v.status,category:v.category,
        location:v.location,skills:v.skills.split(',').map(function(s){return s.trim();}).filter(Boolean),
        source:v.source||'',
        desiredRate:(v.desiredRate===''||v.desiredRate==null)?null:Number(v.desiredRate),
        availability:v.availability,
        employmentPref:v.employmentPref,relocate:false,owner:'A. Trainee',added:iso(TODAY),
        phone:v.phone,email:v.email,mine:true};
      DB.candidates.push(c);
      log('Added Candidate',c.name+' ('+c.id+')');
      toast('Candidate saved','ok');
      if(jobId)A.addToPipeline(jobId,c.id); else go('candidate',c.id);
    }});
};

A.addToPipeline=function(jobId,candidateId){
  var jobs=addableJobs();
  if(!jobs.length){toast('No job order is accepting candidates','no');return;}
  openForm({title:'Add to Job Order pipeline',
    intro:'This creates the submission record at New Lead. From here every status change is stamped with a time and a user, which is what makes the pipeline an audit trail.',
    fields:[
      {k:'jobId',label:'Job order',type:'select',required:true,value:jobId||jobs[0].id,
        options:jobs.map(function(j){return {v:j.id,t:j.title+' · '+coName(j.companyId)};})},
      {k:'candidateId',label:'Candidate',type:'select',required:true,value:candidateId||'',
        options:DB.candidates.map(function(c){return {v:c.id,t:c.name+' · '+c.occupation};})}
    ],
    validate:function(v){
      var e={};
      var dup=DB.subs.filter(function(s){return s.jobId===v.jobId&&s.candidateId===v.candidateId;});
      if(dup.length)e.candidateId='This candidate is already on this pipeline at status "'+dup[0].status+'".';
      var cd=byId(DB.candidates,v.candidateId);
      if(cd&&['Do Not Call','Archive'].indexOf(cd.status)>=0)
        e.candidateId='This candidate is set to '+cd.status+' and must not be submitted. Change the status on the candidate record first, with a reason.';
      return e;
    },
    submit:'Add to pipeline',
    onSubmit:function(v){
      var now=new Date().toISOString();
      var s={id:uid('SB'),jobId:v.jobId,candidateId:v.candidateId,status:'New Lead',owner:'A. Trainee',
        added:now,modified:now,history:[{status:'New Lead',at:now,by:'A. Trainee'}],mine:true,
        screenNote:'',summary:'',payRate:null,billRate:null,sentTo:null,sendoutAt:null,
        apptId:null,startDate:null,reason:null};
      DB.subs.push(s);
      log('Added to pipeline',candName(s.candidateId)+' → '+jobName(s.jobId));
      toast('Added at New Lead','ok');go('job',v.jobId,'pipeline');
    }});
};

function stepSpec(sub,next){
  var job=byId(DB.jobs,sub.jobId);
  var cand=byId(DB.candidates,sub.candidateId);
  return ({
  'Internal Submission':{
    intro:'Your own quality gate. You confirm the facts directly with the candidate and write it up for the client. If it would not survive your manager reading it aloud, it is not ready.',
    fields:[
      {k:'screenNote',label:'Screening notes',type:'textarea',required:true,min:40,value:sub.screenNote,
        hint:'Relevant experience, shift suitability, rate expectation, any gaps. At least 40 characters.'},
      {k:'availability',label:'Confirmed availability',type:'select',required:true,value:cand.availability,
        options:['Immediate','1 week','2 weeks','4 weeks','Notice period']},
      {k:'desiredRate',label:'Confirmed pay expectation',type:'number',required:true,value:cand.desiredRate,minNum:1,
        hint:'Confirming the rate now prevents a collapsed offer later.'},
      {k:'summary',label:'Client-facing summary',type:'textarea',required:true,min:60,value:sub.summary,
        hint:'Written for the client, matched to the job description. At least 60 characters.'}
    ],
    apply:function(v){
      sub.screenNote=v.screenNote;sub.summary=v.summary;
      cand.availability=v.availability;cand.desiredRate=Number(v.desiredRate);
      if(cand.status==='New Lead')cand.status='Active';
    }},
  'Client Submission':{
    intro:job.type==='Direct Hire'
      ?'This is the sendout. On a direct hire the salary and the fee are what you are held to, so agree them before the CV goes anywhere.'
      :'This is the sendout. Rates are locked here and the client contact is recorded as the recipient, so the margin agreed now is the one you will be held to at invoice.',
    fields:(job.type==='Direct Hire'
      ?[{k:'salary',label:'Salary offered to the candidate',type:'number',required:true,minNum:1,
          value:sub.salary||job.salary||'',
          hint:'A direct hire carries no hourly rates. The fee follows the salary.'}]
      :[{k:'payRate',label:'Pay rate per hour',type:'number',required:true,minNum:1,
          value:sub.payRate||cand.desiredRate||''},
        {k:'billRate',label:'Bill rate per hour',type:'number',required:true,minNum:1,
          value:sub.billRate||job.billRate||''}]
    ).concat([
      {k:'sentTo',label:'Submit to',type:'select',required:true,value:sub.sentTo||job.contactId,
        options:coContacts(job.companyId).map(function(c){return {v:c.id,t:c.name+' \u00b7 '+c.title};})},
      {k:'consent',label:'Candidate has confirmed interest in this role and consented to being submitted to '+
        coName(job.companyId)+(job.type==='Direct Hire'?' at this salary':' at this rate'),
        type:'check',required:true,
        hint:'Submitting without consent is a compliance breach, not a shortcut.'}
    ]),
    validate:function(v){
      var e={};
      if(!cand.cv)
        e.consent='HARD STOP: '+cand.name+' has no CV on file. A client submission without a CV is not a '+
          'submission. Upload the CV on the candidate record first.';
      else if(['Do Not Call','Archive'].indexOf(cand.status)>=0)
        e.consent='HARD STOP: this candidate is set to '+cand.status+
          ' and must not be submitted. Change the status on the candidate record first, with a reason.';
      else if(['Closed','Cancelled'].indexOf(job.status)>=0)
        e.consent='HARD STOP: the job order is '+job.status+', so nothing can be submitted to it.';
      else if(job.type==='Direct Hire'){
        if(!v.salary)e.salary='HARD STOP: a direct hire needs a salary before it goes to the client.';
        else if(job.salary&&Number(v.salary)>job.salary*1.2)
          e.salary='More than 20 per cent above the salary on the job order ('+money(job.salary)+
            '). Get the range varied with the client rather than sending over it.';
      }
      else if(Number(v.billRate)<=Number(v.payRate))
        e.billRate='HARD STOP: bill rate must exceed pay rate. This sendout would run at zero or negative margin.';
      else {
        if(Number(v.billRate)>job.billRate)e.billRate='This is above the job order bill rate of '+
          money(job.billRate)+'. That needs a reason and a manager behind it before the placement can be approved.';
        if(!sub.screenNote||sub.screenNote.length<40)
          e.sentTo='No screening notes on this submission. You are vouching for someone you have not written up.';
        else if(!sub.summary||sub.summary.length<60)
          e.sentTo='No client-facing summary. The client has to work out for themselves why you sent this.';
        else if(cand.desiredRate!=null&&Number(v.payRate)<cand.desiredRate)
          e.payRate='Below the confirmed pay expectation of '+money(cand.desiredRate)+
            '. Renegotiate before sending, not after.';
      }
      return e;
    },
    apply:function(v){
      if(job.type==='Direct Hire'){
        sub.salary=Number(v.salary);
        sub.flatFee=job.flatFee||Math.round(Number(v.salary)*0.2);
      } else {
        sub.payRate=Number(v.payRate);sub.billRate=Number(v.billRate);
      }
      sub.sentTo=v.sentTo;
      sub.sendoutAt=new Date().toISOString();
      if(cand.status!=='Placed')cand.status='Submitted';
      var covered=jobSubs(job.id).filter(function(x){return !!x.sendoutAt;}).length+1;
      if(job.status==='Accepting Candidates'&&covered>=job.openings*2)job.status='Covered';
      notify('Sendout: '+cand.name+' to '+coName(job.companyId),'job',job.id);
    }},
  'Interview Scheduled':{
    intro:'Scheduling creates an appointment on both the candidate and the job order. Interview slots that live only in your inbox are how candidates get missed.',
    fields:[
      {k:'date',label:'Interview date',type:'date',required:true,value:iso(dOff(2))},
      {k:'time',label:'Start time',type:'time',required:true,value:'10:00'},
      {k:'duration',label:'Duration in minutes',type:'number',required:true,minNum:15,value:45},
      {k:'location',label:'Format',type:'select',required:true,options:['On site','Video','Phone']},
      {k:'attendees',label:'Client interviewer',type:'text',required:true,value:ctName(sub.sentTo||job.contactId)},
      {k:'briefed',label:'Candidate has been briefed on format, location and interviewer',type:'check',required:true}
    ],
    validate:function(v){
      var e={};
      if(v.date&&new Date(v.date+'T00:00')<new Date(iso(TODAY)+'T00:00'))e.date='Interview date is in the past.';
      return e;
    },
    apply:function(v){
      var a={id:uid('AP'),subject:'Client interview — '+cand.name,type:'Interview',
        at:new Date(v.date+'T'+v.time).toISOString(),duration:Number(v.duration),location:v.location,
        attendees:v.attendees,jobId:job.id,candidateId:cand.id,mine:true};
      DB.appts.push(a);sub.apptId=a.id;
    }},
  'Offer Extended':{
    intro:'Confirm the commercials and the start date together. A start date without confirmed money is not an offer.',
    fields:(job.type==='Direct Hire'
      ?[{k:'salary',label:'Final salary',type:'number',required:true,minNum:1,
          value:sub.salary||job.salary||''},
        {k:'flatFee',label:'Fee invoiced on placement',type:'number',required:true,minNum:1,
          value:sub.flatFee||job.flatFee||''}]
      :[{k:'payRate',label:'Final pay rate',type:'number',required:true,minNum:1,value:sub.payRate},
        {k:'billRate',label:'Final bill rate',type:'number',required:true,minNum:1,value:sub.billRate}]
    ).concat([
      {k:'startDate',label:'Proposed start date',type:'date',required:true,value:iso(dOff(14))},
      {k:'note',label:'Offer conversation notes',type:'textarea',required:true,min:25,
        hint:'What the candidate said, and any condition attached to the acceptance.'}
    ]),
    validate:function(v){
      var e={};
      if(job.type!=='Direct Hire'){
        if(Number(v.billRate)<=Number(v.payRate))e.billRate='HARD STOP: bill rate must exceed pay rate.';
        else if(Number(v.billRate)>job.billRate)e.billRate='Above the job order bill rate of '+
          money(job.billRate)+'. Record the reason and route it for approval rather than quietly repricing.';
      }
      if(v.startDate&&new Date(v.startDate+'T00:00')<new Date(iso(TODAY)+'T00:00'))
        e.startDate='Start date is in the past.';
      return e;
    },
    apply:function(v){
      if(job.type==='Direct Hire'){
        sub.salary=Number(v.salary);sub.flatFee=Number(v.flatFee);
      } else {
        sub.payRate=Number(v.payRate);sub.billRate=Number(v.billRate);
      }
      sub.startDate=v.startDate;
      DB.notes.push({id:uid('NT'),action:'Outbound Call',text:'Offer discussion: '+v.note,
        at:new Date().toISOString(),by:'A. Trainee',
        links:{candidateId:cand.id,jobId:job.id},mine:true});
    }},
  'Placed':{
    intro:'Placing consumes an opening, sets the candidate to Placed, and creates a placement at Pending Approval. Nothing bills until that placement is approved and onboarding is clear.',
    fields:[
      {k:'employmentType',label:'Employment type',type:'select',required:true,options:EMP_TYPE,
        value:job.type==='Direct Hire'?'Permanent':'W2'},
      {k:'startDate',label:'Confirmed start date',type:'date',required:true,value:sub.startDate||iso(dOff(14))},
      {k:'endDate',label:'Assignment end date',type:'date',
        required:job.type!=='Direct Hire',value:iso(dOff(104)),
        hint:job.type==='Direct Hire'
          ?'A permanent placement has no assignment end date. Leave it blank.'
          :'Contract assignments need an end date for forecasting and extension tracking.'},
      {k:'confirm',label:'Candidate has accepted in writing and the client has confirmed the start',type:'check',required:true}
    ],
    validate:function(v){
      var e={};
      if(job.filled>=job.openings)e.confirm='This job order has no openings left. Vary the openings on the job order before placing.';
      if(v.endDate&&v.startDate&&new Date(v.endDate)<=new Date(v.startDate))
        e.endDate='HARD STOP: end date must be after the start date.';
      return e;
    },
    apply:function(v){
      sub.startDate=v.startDate;
      var p={id:uid('PL'),jobId:job.id,candidateId:cand.id,subId:sub.id,status:'Pending Approval',
        employmentType:v.employmentType,start:v.startDate,end:v.endDate||null,
        payRate:sub.payRate||0,billRate:sub.billRate||0,
        salary:sub.salary||job.salary||0,flatFee:sub.flatFee||job.flatFee||0,
        perm:job.type==='Direct Hire',
        approvedBy:null,createdBy:'A. Trainee',mine:true,onboard:{}};
      ONBOARD.forEach(function(o){p.onboard[o.k]=false;});
      DB.placements.push(p);
      job.filled+=1;
      if(job.filled>=job.openings)job.status='Filled';
      cand.status='Placed';
      DB.tasks.push({id:uid('TK'),subject:'Complete onboarding pack for '+cand.name,due:v.startDate,
        priority:'High',owner:'A. Trainee',entity:p.id,done:false,mine:true});
      log('Created Placement',cand.name+' at '+coName(job.companyId)+' (Pending Approval)');
      notify('Placement created for '+cand.name+' \u2014 pending approval','placement',p.id);
    }}
  })[next];
}

A.advance=function(subId){
  var sub=byId(DB.subs,subId);
  if(!sub)return;
  if(PIPE_OUT.indexOf(sub.status)>=0){toast('This submission is closed','no');return;}
  var ix=pIx(sub.status);
  if(ix>=PIPE_K.length-1){toast('Already placed','no');return;}
  var next=PIPE_K[ix+1];
  var spec=stepSpec(sub,next);
  openForm({title:'Change status to '+next,
    intro:spec.intro,
    note:candName(sub.candidateId)+' · '+jobName(sub.jobId)+' · step '+(ix+2)+' of '+PIPE_K.length,
    fields:spec.fields,validate:spec.validate,submit:'Save and change status',
    onSubmit:function(v){
      spec.apply(v);
      sub.status=next;sub.modified=new Date().toISOString();
      sub.history.push({status:next,at:sub.modified,by:'A. Trainee'});
      log('Submission status → '+next,candName(sub.candidateId)+' on '+jobName(sub.jobId));
      toast(next==='Client Submission'?'Sendout recorded':'Status changed to '+next,'ok');
      render();
    }});
};

A.reject=function(subId){
  var sub=byId(DB.subs,subId);
  openForm({title:'Close this submission',
    intro:'Closing properly is what keeps conversion data honest. Who declined matters: client declines point at submission quality, candidate declines point at rate or briefing.',
    fields:[
      {k:'status',label:'Outcome',type:'select',required:true,options:PIPE_OUT,
        hint:'Client Declined, Candidate Declined, or Not Proceeding where neither party formally declined.'},
      {k:'reason',label:'Reason',type:'textarea',required:true,min:20,hint:'Specific and factual. "Not a fit" is not a reason.'}
    ],
    submit:'Close submission',
    onSubmit:function(v){
      sub.status=v.status;sub.reason=v.reason;sub.modified=new Date().toISOString();
      sub.history.push({status:v.status,at:sub.modified,by:'A. Trainee'});
      var cand=byId(DB.candidates,sub.candidateId);
      if(cand&&cand.status==='Submitted'){
        var still=candSubs(cand.id).some(function(s){
          return !!s.sendoutAt&&PIPE_OUT.indexOf(s.status)<0&&s.status!=='Placed';});
        if(!still)cand.status='Active';
      }
      log('Submission closed as '+v.status,candName(sub.candidateId)+' on '+jobName(sub.jobId));
      toast('Submission closed','ok');render();
    }});
};

A.approvePlacement=function(id){
  var p=byId(DB.placements,id);
  var j=byId(DB.jobs,p.jobId);
  var band=marginBand(p.payRate,p.billRate,p);
  var overRate=p.billRate>j.billRate;
  var creator=p.createdBy||'A. Trainee';
  var approvers=['M. Silva','A. Rao','A. Trainee'].filter(function(x){return x!==creator;});
  openForm({title:'Approve placement',
    intro:'Approval is a commercial sign-off, and a recruiter cannot approve their own placement. Once approved the placement is billable, so the rates, dates and employment type must match the signed paperwork.',
    note:candName(p.candidateId)+' \u00b7 '+jobName(p.jobId)+' \u00b7 markup '+markup(p.payRate,p.billRate)+
      '% \u00b7 gross margin '+Math.round(band.m)+'% ('+band.t+')'+
      (overRate?' \u00b7 bill rate is above the job order rate':''),
    fields:[
      {k:'decision',label:'Decision',type:'select',required:true,
        options:['Approved','Rejected','Pending Approval'],
        hint:'Rejected sends it back to the recruiter to correct and resubmit.'},
      {k:'approver',label:'Approved by',type:'select',required:true,options:approvers,
        hint:'Created by '+creator+', who cannot sign it off. '+
          (band.k==='review'?'This margin needs a manager.':'')},
      {k:'reason',label:overRate?'Reason for billing above the job order rate':'Approval note',
        type:'textarea',required:true,min:20,
        hint:overRate?'The bill rate exceeds the job order rate. Record who agreed the variation on the client side.':''},
      {k:'checked',label:'Rates, start and end dates and employment type match the signed contract',type:'check',required:true}
    ],
    validate:function(v){
      var e={};
      if(v.decision==='Approved'&&band.k==='block')
        e.decision='Gross margin is '+Math.round(band.m)+'%, '+band.t+
          '. This cannot be approved. Renegotiate the pay or bill rate, or withdraw the placement.';
      if(v.decision==='Approved'&&v.approver==='A. Trainee'&&band.k==='review')
        e.approver='A margin '+band.t+' cannot be signed off by a recruiter. Route it to M. Silva or A. Rao.';
      if(v.decision==='Approved'&&v.approver===creator)
        e.approver='The person who created the placement cannot approve it.';
      return e;
    },
    submit:'Record decision',
    onSubmit:function(v){
      p.status=v.decision;
      p.approvedBy=v.decision==='Approved'?v.approver:null;
      p.approvalNote=v.reason;
      DB.notes.push({id:uid('NT'),action:'Internal Memo',
        text:'Placement '+v.decision+' by '+v.approver+'. '+v.reason,
        at:new Date().toISOString(),by:'A. Trainee',
        links:{candidateId:p.candidateId,jobId:p.jobId,companyId:j.companyId},mine:true});
      log('Placement '+v.decision,candName(p.candidateId)+' \u00b7 margin '+Math.round(band.m)+
        '% \u00b7 by '+v.approver);
      notify('Placement '+v.decision.toLowerCase()+' for '+candName(p.candidateId),'placement',p.id);
      toast('Placement '+v.decision.toLowerCase(),v.decision==='Approved'?'ok':'no');
      render();
    }});
};
A.toggleOnboard=function(pid,key){
  var p=byId(DB.placements,pid);
  var item=ONBOARD.filter(function(o){return o.k===key;})[0];
  if(p.onboard[key]){
    p.onboard[key]=false;
    log('Reopened onboarding item',item.t+' · '+candName(p.candidateId));
    render();return;
  }
  p.onboard[key]=true;
  log('Cleared onboarding item',item.t+' · '+candName(p.candidateId));
  if(ONBOARD.every(function(o){return p.onboard[o.k];})){
    DB.tasks.forEach(function(t){if(t.entity===p.id)t.done=true;});
    toast('Onboarding complete','ok');
  }
  render();
};

A.addTime=function(pid){
  var p=byId(DB.placements,pid);
  var j=byId(DB.jobs,p.jobId);
  if(j.type==='Direct Hire'){
    openInfo('No timesheets on a direct hire','Direct hire placements are fee based. There are no hours to submit, so the placement completes at the end of the guarantee period instead.','','warn');
    return;
  }
  if(p.status!=='Approved'){
    openInfo('Time entry blocked','This placement is at '+p.status+'. Hours cannot be entered against an unapproved placement, because there is no authorised rate to bill against.','','bad');
    return;
  }
  var gaps=ONBOARD.filter(function(o){return !p.onboard[o.k];});
  if(gaps.length&&DB.blockTimeOnOnboarding===false){
    toast(gaps.length+' onboarding item(s) still outstanding','no');
    gaps=[];
  }
  if(gaps.length){
    openInfo('Time entry blocked',
      'This placement has '+gaps.length+' outstanding onboarding item(s). Hours cannot be entered until the pack is complete, because an unverified worker cannot be invoiced.',
      '<ul style="margin:0;padding-left:18px">'+gaps.map(function(g){return '<li>'+esc(g.t)+'</li>';}).join('')+'</ul>','bad');
    return;
  }
  openForm({title:'Add time entry',
    intro:'Hours drive both the client invoice and the worker\u2019s pay. A late or wrong entry is felt on both sides.',
    fields:[
      {k:'weekEnding',label:'Week ending',type:'date',required:true,value:iso(dOff(0))},
      {k:'regular',label:'Regular hours',type:'number',required:true,minNum:0,value:40},
      {k:'overtime',label:'Overtime hours',type:'number',required:true,minNum:0,value:0,
        hint:'Anything over 40 regular hours is overtime and bills at 1.5x.'},
      {k:'otApproved',label:'Client has pre-approved this overtime',type:'check',
        hint:'Unapproved overtime still goes through, but it is flagged for the client to confirm before invoicing.'},
      {k:'note',label:'Note',type:'text',required:false}
    ],
    validate:function(v){
      var e={};
      if(Number(v.regular)>60)e.regular='Over 60 regular hours in a week needs client sign-off before entry.';
      if(Number(v.overtime)>0&&!v.otApproved)
        e.otApproved='This overtime has not been pre-approved by the client. It can still be entered, '+
          'but it will be flagged as unapproved and held before invoicing.';
      if(Number(v.overtime)>24)e.overtime='HARD STOP: over 24 overtime hours in one week needs a manager to enter it.';
      var dup=DB.times.filter(function(t){return t.placementId===pid&&t.weekEnding===v.weekEnding;});
      if(dup.length)e.weekEnding='A time entry already exists for this week ('+dup[0].status+').';
      return e;
    },
    submit:'Submit time entry',
    onSubmit:function(v){
      DB.times.push({id:uid('TE'),placementId:pid,weekEnding:v.weekEnding,regular:Number(v.regular),
        overtime:Number(v.overtime),otApproved:!!v.otApproved,status:'Submitted',note:v.note||'',mine:true});
      if(Number(v.overtime)>0&&!v.otApproved)
        notify('Unapproved overtime on '+candName(p.candidateId)+' — needs client confirmation','placement',pid);
      log('Submitted time entry',candName(p.candidateId)+' · week ending '+v.weekEnding);
      toast('Time entry submitted','ok');render();
    }});
};

A.decideTime=function(id){
  var t=byId(DB.times,id);
  var p=byId(DB.placements,t.placementId);
  var bill=p.billRate*t.regular+p.billRate*1.5*t.overtime;
  openForm({title:'Approve time',
    intro:'Approval authorises the invoice. Check the hours against the assignment and the roster before releasing them.',
    note:candName(p.candidateId)+' · week ending '+fmtD(t.weekEnding)+' · '+t.regular+'h regular, '+t.overtime+'h overtime · bills '+money(Math.round(bill)),
    fields:[
      {k:'decision',label:'Decision',type:'select',required:true,options:['Approved','Rejected']},
      {k:'note',label:'Note',type:'textarea',required:true,min:15,hint:'If rejected, state exactly what the worker must correct.'}
    ],
    submit:'Record decision',
    onSubmit:function(v){
      t.status=v.decision;t.note=v.note;
      log('Time entry '+v.decision.toLowerCase(),candName(p.candidateId)+' · '+(t.regular+t.overtime)+'h');
      toast('Time entry '+v.decision.toLowerCase(),v.decision==='Approved'?'ok':'no');
      render();
    }});
};

A.addNote=function(pre){
  pre=pre||{};
  var opt=function(arr,fn){return [{v:'',t:'— none —'}].concat(arr.map(fn));};
  openForm({title:'Add Note',
    intro:'A note is logged against every record it concerns, so it appears on the candidate, the contact, the company and the job order at once. One note, linked properly, beats four copies.',
    fields:[
      {k:'action',label:'Action',type:'select',required:true,options:NOTE_ACTIONS,value:pre.action||'Call',
        hint:'Action is reportable. Activity targets are counted by action, not by note volume.'},
      {k:'candidateId',label:'Candidate',type:'select',value:pre.candidateId||'',
        options:opt(DB.candidates,function(c){return {v:c.id,t:c.name};})},
      {k:'contactId',label:'Contact',type:'select',value:pre.contactId||'',
        options:opt(DB.contacts,function(c){return {v:c.id,t:c.name+' · '+coName(c.companyId)};})},
      {k:'companyId',label:'Company',type:'select',value:pre.companyId||'',
        options:opt(DB.companies,function(c){return {v:c.id,t:c.name};})},
      {k:'jobId',label:'Job order',type:'select',value:pre.jobId||'',
        options:opt(DB.jobs,function(j){return {v:j.id,t:j.title+' · '+coName(j.companyId)};})},
      {k:'text',label:'Comments',type:'textarea',required:true,min:25,
        hint:'Outcome first, then the next step and who owns it. At least 25 characters.'}
    ],
    validate:function(v){
      var e={};
      if(!v.candidateId&&!v.contactId&&!v.companyId&&!v.jobId)
        e.action='A note must be linked to at least one record, otherwise nobody will ever find it.';
      return e;
    },
    submit:'Save Note',
    onSubmit:function(v){
      var links={};
      ['candidateId','contactId','companyId','jobId'].forEach(function(k){if(v[k])links[k]=v[k];});
      DB.notes.push({id:uid('NT'),action:v.action,text:v.text,at:new Date().toISOString(),
        by:'A. Trainee',links:links,mine:true});
      log('Added Note ('+v.action+')',Object.keys(links).length+' record(s) linked');
      toast('Note saved','ok');render();
    }});
};

A.addAppointment=function(pre){
  pre=pre||{};
  var cands=DB.candidates.map(function(c){return {v:c.id,t:c.name};});
  var jobs=DB.jobs.map(function(j){return {v:j.id,t:j.title+' \u00b7 '+coName(j.companyId)};});
  openForm({title:'New Appointment',
    intro:'An appointment on the record is what makes an interview real. One that lives only in your inbox is how candidates get missed.',
    fields:[
      {k:'subject',label:'Subject',type:'text',required:true,
        value:pre.candidateId?'Call with '+candName(pre.candidateId):''},
      {k:'type',label:'Type',type:'select',required:true,
        options:['Interview','Meeting','Call','Other']},
      {k:'date',label:'Date',type:'date',required:true,value:iso(dOff(2))},
      {k:'time',label:'Start time',type:'time',required:true,value:'10:00'},
      {k:'duration',label:'Duration in minutes',type:'number',required:true,minNum:15,value:45},
      {k:'location',label:'Format or location',type:'select',required:true,
        options:['On site','Video','Phone']},
      {k:'attendees',label:'Attendees',type:'text',required:true,value:'A. Trainee'},
      {k:'candidateId',label:'Candidate',type:'select',value:pre.candidateId||'',
        options:[{v:'',t:'\u2014 none \u2014'}].concat(cands)},
      {k:'jobId',label:'Job order',type:'select',value:pre.jobId||'',
        options:[{v:'',t:'\u2014 none \u2014'}].concat(jobs)}
    ],
    validate:function(v){
      var e={};
      if(v.date&&new Date(v.date+'T00:00')<new Date(iso(TODAY)+'T00:00'))
        e.date='That date has passed.';
      if(!v.candidateId&&!v.jobId)
        e.candidateId='Link the appointment to a candidate or a job order, or nobody will find it.';
      return e;
    },
    submit:'Save Appointment',
    onSubmit:function(v){
      var a={id:uid('AP'),subject:v.subject,type:v.type,
        at:new Date(v.date+'T'+v.time).toISOString(),duration:Number(v.duration),
        location:v.location,attendees:v.attendees,
        jobId:v.jobId||null,candidateId:v.candidateId||null,mine:true};
      DB.appts.push(a);
      log('Scheduled an appointment',v.subject+' \u00b7 '+fmtDT(a.at));
      notify('Appointment: '+v.subject+' on '+fmtD(a.at),
        v.candidateId?'candidate':'job',v.candidateId||v.jobId);
      toast('Appointment saved','ok');render();
    }});
};
A.sendResume=function(candId){
  var c=byId(DB.candidates,candId);
  if(!c){return;}
  if(!c.cv){
    openInfo('No resume to send',c.name+' has no resume on file. Attach one on the Files tab first.','','warn');
    return;
  }
  var subs=candSubs(candId).filter(function(s){return s.sentTo;});
  var jobId=subs.length?subs[0].jobId:(DB.jobs[0]||{}).id;
  A.email({to:'contact',candidateId:candId,jobId:jobId,template:'sendout'});
};
A.addTearsheet=function(){
  openForm({title:'Add Tearsheet',
    intro:'A tearsheet is a saved list of candidates you can reuse and mass-contact. Built once against a recurring requirement, it removes the repeat search entirely.',
    fields:[
      {k:'name',label:'Tearsheet name',type:'text',required:true,hint:'Name it by requirement, not by date. "Aurora nights — cleared operatives" survives; "March list" does not.'},
      {k:'description',label:'Description',type:'textarea',required:true,min:25,
        hint:'What qualifies someone for this list, so the next person can maintain it.'}
    ],
    submit:'Save Tearsheet',
    onSubmit:function(v){
      var t={id:uid('TR'),name:v.name,description:v.description,owner:'A. Trainee',
        candidateIds:[],mine:true};
      DB.tearsheets.push(t);
      log('Added Tearsheet',t.name);
      toast('Tearsheet saved','ok');go('tearsheet',t.id);
    }});
};

A.addToTearsheet=function(candidateId){
  if(!DB.tearsheets.length){toast('Create a tearsheet first','no');return;}
  openForm({title:'Add to Tearsheet',
    fields:[
      {k:'trId',label:'Tearsheet',type:'select',required:true,
        options:DB.tearsheets.map(function(t){return {v:t.id,t:t.name+' ('+t.candidateIds.length+')'};})},
      {k:'candidateId',label:'Candidate',type:'select',required:true,value:candidateId||'',
        options:DB.candidates.map(function(c){return {v:c.id,t:c.name+' · '+c.occupation};})}
    ],
    validate:function(v){
      var e={};
      var t=byId(DB.tearsheets,v.trId);
      if(t&&t.candidateIds.indexOf(v.candidateId)>=0)e.candidateId='Already on this tearsheet.';
      return e;
    },
    submit:'Add to tearsheet',
    onSubmit:function(v){
      var t=byId(DB.tearsheets,v.trId);
      t.candidateIds.push(v.candidateId);
      log('Added to Tearsheet',candName(v.candidateId)+' → '+t.name);
      toast('Added to tearsheet','ok');render();
    }});
};

A.addTask=function(pre){
  pre=pre||{};
  openForm({title:'Add Task',
    intro:'A task is a commitment with a date and an owner. Anything you promised a client or candidate belongs here.',
    fields:[
      {k:'subject',label:'Subject',type:'text',required:true},
      {k:'due',label:'Due date',type:'date',required:true,value:iso(dOff(1))},
      {k:'priority',label:'Priority',type:'select',required:true,options:['High','Medium','Low']},
      {k:'entity',label:'Related record',type:'text',required:false,
        value:pre.candidateId||pre.jobId||'',
        hint:'A task can hang off a candidate, contact, company, job order or placement.'},
      {k:'owner',label:'Assigned to',type:'select',required:true,
        options:['A. Trainee','A. Rao','M. Silva'],
        hint:'Tasks can be created for yourself or assigned to a teammate.'}
    ],
    submit:'Save Task',
    onSubmit:function(v){
      DB.tasks.push({id:uid('TK'),subject:v.subject,due:v.due,priority:v.priority,
        owner:v.owner||'A. Trainee',entity:v.entity||'',done:false,mine:true});
      if(v.owner&&v.owner!=='A. Trainee')
        notify('Task assigned to '+v.owner+': '+v.subject,'tasks',null);
      log('Added Task',v.subject);
      toast('Task saved','ok');render();
    }});
};
A.toggleTask=function(id){
  var t=byId(DB.tasks,id);t.done=!t.done;
  if(t.done)log('Completed Task',t.subject);
  render();
};

/* ---------------------------------------------------------------- review + assessment */
function reviewAnswers(){
  var worst=null;
  DB.jobs.forEach(function(j){
    var f=funnel(jobSubs(j.id));
    if(f['Client Submission']<1)return;
    var r=f['Interview Scheduled']/f['Client Submission'];
    if(!worst||r<worst.r)worst={j:j,r:r};
  });
  return {q1:worst?worst.j.id:(DB.jobs[0]||{}).id,
    q2:String(staleSubs().length),
    q3:onboardGaps().length?onboardGaps()[0].id:'none'};
}
A.review=function(){
  var ans=reviewAnswers();
  var plOpts=DB.placements.map(function(p){return {v:p.id,t:candName(p.candidateId)+' · '+jobName(p.jobId)};});
  plOpts.push({v:'none',t:'No placement has an onboarding gap'});
  openForm({title:'Weekly desk review',wide:true,
    intro:'Read the reports, then answer from the data rather than from memory. This is the conversation you will have with an operations manager every week.',
    fields:[
      {k:'q1',label:'Which job order has the weakest conversion from client submission to interview?',type:'select',required:true,
        options:DB.jobs.map(function(j){return {v:j.id,t:j.title+' · '+coName(j.companyId)};})},
      {k:'q2',label:'How many live submissions have had no status change for five days or more?',type:'select',required:true,
        options:['0','1','2','3','4','5','6','7','8','9','10','11','12']},
      {k:'q3',label:'Which placement is carrying an incomplete onboarding pack?',type:'select',required:true,options:plOpts}
    ],
    submit:'Submit review',
    onSubmit:function(v){
      var score=0,fb=[];
      if(v.q1===ans.q1)score++;else fb.push('Conversion: recalculate client submission to interview per job order in Reports. The weakest is '+jobName(ans.q1)+'.');
      if(v.q2===ans.q2)score++;else fb.push('Ageing: the correct figure is '+ans.q2+'. Reports flags any live submission untouched for five days or more.');
      if(v.q3===ans.q3)score++;else fb.push('Onboarding: '+(ans.q3==='none'?'no placement has a gap right now.':candName((byId(DB.placements,ans.q3)||{}).candidateId)+' has outstanding items.'));
      DB.quiz={score:score,at:new Date().toISOString()};
      log('Completed weekly desk review',score+'/3');
      openInfo('Desk review scored '+score+'/3',
        score===3?'All three read correctly from the data. This is the standard expected before you run a live client review.':'Work through the points below, then reopen the review.',
        fb.length?'<ul style="margin:0;padding-left:18px">'+fb.map(function(f){return '<li>'+esc(f)+'</li>';}).join('')+'</ul>':'',
        score===3?'ok':'warn');
      render();
    }});
};

var QUESTIONS=[
  {q:'A client contact asks for a CV informally, before you have spoken to the candidate about this role. What do you do?',
   o:['Send it, the client relationship comes first','Confirm consent and rate, then move the submission to Client Submission','Send it with the name removed','Ask your manager to send it'],a:1,
   why:'Consent and rate are confirmed first, and the sendout is recorded so the audit trail and the conversion data both hold.'},
  {q:'What does a job order status of Covered mean?',
   o:['Every opening is placed','The client has enough live candidates to decide on','The job order is closed','Onboarding is complete'],a:1,
   why:'Covered means submission volume is sufficient. Filled means every opening is consumed by a placement. Confusing the two misstates coverage.'},
  {q:'Which status change creates the sendout and locks the rates?',
   o:['Internal Submission','Client Submission','Interview Scheduled','Offer Extended'],a:1,
   why:'Client Submission is the sendout. Rates and recipient are stamped there, and that is the margin you are held to at invoice.'},
  {q:'A submission has sat at Client Submission for nine days with no change. What is the reporting consequence?',
   o:['None, the status is correct','It inflates live pipeline and hides that the client has gone quiet','It reduces time to fill','It closes automatically'],a:1,
   why:'Stale statuses make coverage look healthier than it is. Ageing is the metric that exposes it.'},
  {q:'Which action consumes an opening on a job order?',
   o:['Client Submission','Interview Scheduled','Offer Extended','Placed'],a:3,
   why:'Only Placed reduces remaining openings, sets the candidate to Placed and creates the placement for approval.'},
  {q:'A worker starts Monday but the background check is outstanding and the placement is still Pending Approval. What happens to time entry?',
   o:['It is entered as normal','It is blocked on both counts until approval and onboarding are complete','It is entered at a reduced rate','The client enters it instead'],a:1,
   why:'An unapproved placement has no authorised rate and an unverified worker cannot be invoiced. Either one alone blocks time entry.'},
  {q:'You created a second candidate record for someone already in the system. What is the main damage?',
   o:['Wasted storage','Split note history and double counting in source and conversion reporting','The candidate is contacted twice','Nothing, records merge automatically'],a:1,
   why:'Duplicates break the activity history and corrupt every ratio calculated from candidate volume.'},
  {q:'Why link one note to the candidate, the contact, the company and the job order rather than writing separate notes?',
   o:['It saves typing','It keeps a single version of what was said visible from every record involved','It hides the note from other users','Notes can only be linked once'],a:1,
   why:'One linked note appears on every related record. Separate copies drift apart and the audit trail stops agreeing with itself.'},
  {q:'Searching nurse returns 40 records and nurs* returns 63. Why?',
   o:['Wildcards search the CV as well','nurse matches the whole word only, while nurs* also matches nurses and nursing',
      'The wildcard ignores the candidate status','nurs* searches more fields'],a:1,
   why:'A bare term matches whole words. The wildcard extends the stem, which is why it is the first thing to reach for when a search returns too little.'},
  {q:'What does the query java OR python AND aws actually search for?',
   o:['All three terms','java, or else both python and aws','Any one of the three','It is invalid'],a:1,
   why:'AND binds tighter than OR, so it reads java OR (python AND aws). Brackets are the only reliable way to control it.'},
  {q:'A CV is attached as a PDF but no text was captured against the record. What is the consequence?',
   o:['None, the file is on the record','The candidate is invisible to any boolean search beyond the indexed fields',
      'The candidate cannot be submitted','The file is deleted automatically'],a:1,
   why:'Search runs on text, not on attachments. A CV with no extractable text is the same as no CV for sourcing purposes.'},
  {q:'You change the pay rate on an approved placement that already has two approved weeks of time. What should happen?',
   o:['The change applies to all weeks','It is refused, because it would misstate what has already been paid',
      'Only future weeks change silently','The placement is terminated'],a:1,
   why:'Retrospective rate changes rewrite history on money already authorised. The correct route is an adjustment, not an edit.'}
];
A.assess=function(){
  openForm({title:'Workflow knowledge check',wide:true,
    intro:'Twelve questions on the rules this environment enforces, including boolean search and record editing. Score and feedback appear on submission, and the result goes into your session summary. Pass mark is eight.',
    fields:QUESTIONS.map(function(q,i){
      return {k:'q'+i,label:(i+1)+'. '+q.q,type:'select',required:true,
        options:q.o.map(function(o,oi){return {v:String(oi),t:o};})};
    }),
    submit:'Submit answers',
    onSubmit:function(v){
      var score=0,wrong=[];
      QUESTIONS.forEach(function(q,i){
        if(Number(v['q'+i])===q.a)score++;
        else wrong.push('<li><b>Q'+(i+1)+'.</b> Correct answer: '+esc(q.o[q.a])+'. '+esc(q.why)+'</li>');
      });
      DB.assess={score:score,total:QUESTIONS.length,at:new Date().toISOString()};
      log('Completed knowledge check',score+'/'+QUESTIONS.length);
      openInfo('Knowledge check: '+score+'/'+QUESTIONS.length,
        score>=8?'Pass. You can be signed off on the workflow rules.':'Below the pass mark of 8. Review the points below and retake.',
        wrong.length?'<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px">'+wrong.join('')+'</ul>':'',
        score>=8?'ok':'warn');
      render();
    }});
};

/* ---------------------------------------------------------------- scenarios */
function mySubs(){return DB.subs.filter(function(s){return s.mine;});}
function reachedMine(st){return mySubs().some(function(s){
  return s.history.some(function(h){return h.status===st;});});}
/* A trainee should practise their own desk, not the whole lifecycle. Each step carries the
   desk type it belongs to, and a scenario stops where that desk stops. */
var DESKS={
  d180:{rank:1,t:'180\u00b0 \u2014 delivery and sourcing',
    ends:'Client Submission',
    blurb:'You work live requirements someone else won. Sourcing, screening, writing up and '+
      'submitting to the client is the whole job, and the sendout is the finish line.'},
  d360:{rank:2,t:'360\u00b0 \u2014 full desk',
    ends:'the candidate starting',
    blurb:'You own the client and the candidate. Business development through to the first day: '+
      'the requirement, the sendout, the interview, the offer, the placement and onboarding.'},
  dvms:{rank:3,t:'VMS and full lifecycle',
    ends:'approved hours',
    blurb:'Everything a 360 desk does, and then the back office: placement approval, compliance, '+
      'timesheets and getting hours approved so the assignment can be invoiced.'}
};
var DESK_ORDER=['d180','d360','dvms'];
function deskRank(){return (DESKS[DB.desk||'d360']||DESKS.d360).rank;}
var SCENARIOS={
  s1:{name:'1 · Full desk cycle, lead to invoice',
    blurb:'The core sequence. Work top to bottom.',
    steps:[
      {r:2,t:'Add a Lead',h:'+ Add New → Lead',
       c:function(){return DB.leads.some(function(l){return l.mine;});}},
      {r:2,t:'Convert the lead to a company and contact',h:'Open the lead → Convert Lead',
       c:function(){return DB.companies.some(function(c){return c.mine;})&&DB.contacts.some(function(c){return c.mine;});}},
      {r:2,t:'Log a call note against the company and contact',h:'Link one note to both records',
       c:function(){return DB.notes.some(function(n){
         return n.mine&&/Call|Left Message|Prescreen|Client Visit/.test(n.action)&&
           n.links.companyId&&n.links.contactId;});}},
      {r:2,t:'Raise an Opportunity',h:'Company record → Add Opportunity',
       c:function(){return DB.opps.some(function(o){return o.mine;});}},
      {r:2,t:'Convert the opportunity to a Job Order',h:'Opportunity → Convert to Job Order',
       c:function(){return DB.jobs.some(function(j){return j.mine;})&&DB.opps.some(function(o){return o.mine&&o.status==='Won';});}},
      {r:2,t:'Publish the job order to the careers site',h:'Job order → Publish',
       c:function(){return DB.jobs.some(function(j){return j.mine&&j.published;});}},
      {r:1,t:'Add a Candidate',h:'Job order → New Candidate. Watch the duplicate check',
       c:function(){return DB.candidates.some(function(c){return c.mine;});}},
      {r:1,t:'Upload the candidate CV',h:'No CV on file means no client submission',
       c:function(){return DB.candidates.some(function(c){return c.mine&&!!c.cv;});}},
      {r:1,t:'Add the candidate to your job order pipeline',h:'Creates the submission at New Lead',
       c:function(){return mySubs().length>0;}},
      {r:1,t:'Move to Internal Submission',h:'Screening notes plus a client-facing summary',
       c:function(){return reachedMine('Internal Submission');}},
      {r:1,t:'Move to Client Submission',h:'This is the sendout. Mind the rate rules',
       c:function(){return reachedMine('Client Submission');}},
      {r:2,t:'Schedule the interview',h:'Creates an appointment on the record',
       c:function(){return reachedMine('Interview Scheduled');}},
      {r:2,t:'Extend the offer',h:'Final rates plus a start date',
       c:function(){return reachedMine('Offer Extended');}},
      {r:2,t:'Place the candidate',h:'Creates a placement at Pending Approval',
       c:function(){return reachedMine('Placed');}},
      {r:2,t:'Approve the placement',h:'Check the margin threshold',
       c:function(){return DB.placements.some(function(p){return p.mine&&p.status==='Approved';});}},
      {r:2,t:'Complete the onboarding pack',h:'All six items on your placement',
       c:function(){return DB.placements.some(function(p){
         return p.mine&&ONBOARD.every(function(o){return p.onboard[o.k];});});}},
      {r:3,t:'Enter the first week of time',h:'Blocked until approval and onboarding are clear',
       c:function(){return DB.times.some(function(t){
         var p=byId(DB.placements,t.placementId);return t.mine&&p&&p.mine;});}},
      {r:3,t:'Approve that time entry',h:'Time & Expense → Approval Centre',
       c:function(){return DB.times.some(function(t){
         var p=byId(DB.placements,t.placementId);return p&&p.mine&&t.status==='Approved';});}}
    ]},
  s2:{name:'2 · Clear an inherited desk',
    blurb:'You have taken over a colleague\u2019s desk. Six records are wrong or stalled.',
    steps:[
      {r:1,t:'Close a submission that has no usable reason',h:'Pipeline → open one → Close submission',
       c:function(){return DB.subs.some(function(s){
         return PIPE_OUT.indexOf(s.status)>=0&&s.history.some(function(h){return h.by==='A. Trainee';});});}},
      {r:1,t:'Advance a submission stalled five days or more',h:'Move it forward, do not just close it',
       c:function(){return DB.subs.some(function(s){
         return !s.mine&&s.history.some(function(h){
           return h.by==='A. Trainee'&&PIPE_OUT.indexOf(h.status)<0;});});}},
      {r:2,t:'Clear the outstanding onboarding items on the inherited placement',h:'Placements → the one showing a gap',
       c:function(){return DB.placements.filter(function(p){return !p.mine;})
         .every(function(p){return ONBOARD.every(function(o){return p.onboard[o.k];});});}},
      {r:3,t:'Action the pending time entry',h:'Approval Centre → approve or reject with a note',
       c:function(){return DB.times.filter(function(t){return !t.mine;})
         .every(function(t){return t.status!=='Submitted';});}},
      {r:1,t:'Log a note on a candidate with no recent contact',h:'Reports lists them under data quality',
       c:function(){return DB.notes.some(function(n){return n.mine&&n.links.candidateId;});}},
      {r:2,t:'Correct the status of the job order that is fully filled',h:'Job orders → full coverage but still accepting',
       c:function(){return !DB.jobs.some(function(j){
         return ['Closed','Cancelled','Filled'].indexOf(j.status)<0&&j.filled>=j.openings;});}},
      {r:1,t:'Build a tearsheet for the recurring requirement',h:'+ Add New → Tearsheet, then add two candidates',
       c:function(){return DB.tearsheets.some(function(t){return t.mine&&t.candidateIds.length>=2;});}}
    ]},
  s4:{name:'4 · Source from the CV database',
    blurb:'162 candidate records, 150 with a full CV. Find the right ones and act on them.',
    steps:[
      {t:'Run a boolean search',h:'Candidate Search → try one of the example queries',
       c:function(){return DB.audit.some(function(a){return a.action==='Ran boolean search';});}},
      {t:'Narrow it with NOT or a field',h:'Add NOT, a minus, or something like skills:aws',
       c:function(){return DB.audit.some(function(a){
         return a.action==='Ran boolean search'&&/\bNOT\b|\s-\w|\w+:/.test(a.detail);});}},
      {t:'Save the search',h:'Name it by requirement, not by date',
       c:function(){return DB.savedSearches.some(function(x){return x.mine;});}},
      {t:'Build a tearsheet of at least three from the results',h:'Select rows, then Add selected to tearsheet',
       c:function(){return DB.tearsheets.some(function(t){return t.mine&&t.candidateIds.length>=3;});}},
      {t:'Add at least two of them to a job order pipeline',h:'Add selected to pipeline. Watch what gets blocked',
       c:function(){return mySubs().length>=2;}},
      {t:'Upload or replace a CV',h:'Candidate → Upload CV. Text is what makes it searchable',
       c:function(){return DB.audit.some(function(a){
         return /resume file|Parsed resume/i.test(a.action);});}},
      {t:'Correct a record you own',h:'Any Edit button. The change is logged field by field',
       c:function(){return DB.audit.some(function(a){return /^Edited /.test(a.action);});}},
      {t:'Save the dataset to the local database',h:'Database → Save now',
       c:function(){return DB.audit.some(function(a){return /^Edited |^Uploaded CV|^Saved search/.test(a.action);})&&
         (Store.lastSaved!=null||!Store.available);}}
    ]},
  s3:{name:'3 · Run the weekly desk review',
    blurb:'Turn the data into answers you could defend in an operations meeting.',
    steps:[
      {t:'Open Reports and read the funnel and the flags',h:'Conversion is stage to stage, not against total',
       c:function(){return SEEN.reports;}},
      {t:'Score 3 of 3 on the desk review',h:'Reports → Weekly desk review',
       c:function(){return DB.quiz&&DB.quiz.score===3;}},
      {t:'Raise a task against the weakest job order',h:'A review with no follow-up action changes nothing',
       c:function(){return DB.tasks.some(function(t){return t.mine;});}},
      {t:'Pass the knowledge check, 8 of 12 or better',h:'Guide → Knowledge check',
       c:function(){return DB.assess&&DB.assess.score>=8;}}
    ]}
};
function deskSteps(sc){
  var rank=deskRank();
  return sc.steps.filter(function(st){return (st.r||1)<=rank;});
}
function scenarioState(key){
  var sc=SCENARIOS[key],done=0,now=-1;
  var steps=deskSteps(sc);
  var flags=steps.map(function(st,i){
    var ok=false;
    try{ok=!!st.c();}catch(e){ok=false;}
    if(ok)done++;else if(now<0)now=i;
    return ok;
  });
  return {sc:sc,steps:steps,flags:flags,done:done,total:steps.length,now:now};
}

/* ================================================================ edit + audit */
function diffLog(kind,label,pairs){
  var ch=[];
  pairs.forEach(function(p){
    var a=p[1]==null?'':String(p[1]),b=p[2]==null?'':String(p[2]);
    if(a!==b)ch.push(p[0]+' '+(a===''?'(empty)':a)+' → '+(b===''?'(empty)':b));
  });
  if(!ch.length){toast('No changes to save','');return false;}
  log('Edited '+kind,label+': '+ch.join('; '));
  toast(ch.length+' field'+(ch.length>1?'s':'')+' updated','ok');
  return true;
}

A.editCandidate=function(id){
  var c=byId(DB.candidates,id);
  if(!c)return;
  var live=candSubs(c.id).filter(function(s){
    return PIPE_OUT.indexOf(s.status)<0&&s.status!=='Placed';});
  openForm({title:'Edit Candidate',
    intro:'Edits are recorded field by field in the activity log. Changing status, rate or availability changes what this person is eligible for, so the reason matters as much as the value.',
    note:c.name+' · '+c.id+(live.length?' · on '+live.length+' live pipeline(s)':''),
    fields:[
      {k:'name',label:'Name',type:'text',required:true,value:c.name},
      {k:'occupation',label:'Occupation',type:'text',required:true,value:c.occupation},
      {k:'status',label:'Status',type:'select',required:true,options:CD_STATUS,value:c.status,
        hint:'Do Not Call and Archive remove this person from sourcing. Neither is reversible without a reason on the record.'},
      {k:'category',label:'Category',type:'select',required:true,options:CATEGORIES,value:c.category},
      {k:'location',label:'Location',type:'text',required:true,value:c.location},
      {k:'skills',label:'Primary skills',type:'text',required:true,value:(c.skills||[]).join(', '),
        hint:'Comma separated. These are searchable, so spelling matters more here than anywhere else.'},
      {k:'source',label:'Source',type:'select',required:true,value:c.source,
        options:CD_SOURCES},
      {k:'desiredRate',label:'Desired pay rate',type:'number',minNum:1,
        value:c.desiredRate==null?'':c.desiredRate,
        softRequired:'Clearing the rate stores no value rather than zero. The submission check '+
          'that compares against it will stop firing.'},
      {k:'availability',label:'Availability',type:'select',required:true,value:c.availability,
        options:['Immediate','1 week','2 weeks','4 weeks','Notice period']},
      {k:'employmentPref',label:'Employment preference',type:'select',required:true,options:JO_TYPE,value:c.employmentPref},
      {k:'owner',label:'Owner',type:'select',required:true,options:['A. Trainee','A. Rao','M. Silva'],value:c.owner},
      {k:'phone',label:'Phone',type:'text',required:true,value:c.phone},
      {k:'email',label:'Email',type:'text',required:true,value:c.email},
      {k:'ack',label:'I have recorded why this candidate is being taken out of sourcing',type:'check'}
    ],
    validate:function(v){
      var e={};
      if(v.email&&v.email.indexOf('@')<0)e.email='Enter a full email address.';
      var d=dupCheck(v,c.id);
      if(d)e[d.field]='Another candidate already has '+d.why+': '+d.c.name+' ('+d.c.id+'). Merge rather than duplicate.';
      var blocking=['Do Not Call','Archive'].indexOf(v.status)>=0;
      if(blocking&&live.length&&!v.ack)
        e.status='This candidate is live on '+live.length+' pipeline(s). Setting '+v.status+
          ' will leave those submissions stranded. Close them first, or confirm below that the reason is on the record.';
      return e;
    },
    submit:'Save changes',
    onSubmit:function(v){
      var before=[['name',c.name,v.name],['occupation',c.occupation,v.occupation],
        ['status',c.status,v.status],['category',c.category,v.category],['location',c.location,v.location],
        ['skills',(c.skills||[]).join(', '),v.skills],['source',c.source,v.source],
        ['desired rate',c.desiredRate,Number(v.desiredRate)],['availability',c.availability,v.availability],
        ['employment preference',c.employmentPref,v.employmentPref],['owner',c.owner,v.owner],
        ['phone',c.phone,v.phone],['email',c.email,v.email]];
      var changed=diffLog('Candidate',c.name,before);
      c.name=v.name;c.occupation=v.occupation;c.status=v.status;c.category=v.category;
      c.location=v.location;c.source=v.source;
      c.desiredRate=(v.desiredRate===''||v.desiredRate==null)?null:Number(v.desiredRate);
      c.availability=v.availability;c.employmentPref=v.employmentPref;c.owner=v.owner;
      c.phone=v.phone;c.email=v.email;
      c.skills=v.skills.split(',').map(function(s){return s.trim();}).filter(Boolean);
      if(changed)c.edited=new Date().toISOString();
      render();
    }});
};

A.editCompany=function(id){
  var c=byId(DB.companies,id);
  if(!c)return;
  openForm({title:'Edit Company',
    intro:'The company name appears on every downstream record. Renaming it is a reporting event, not a cosmetic one.',
    note:c.name+' · '+c.id,
    fields:[
      {k:'name',label:'Company name',type:'text',required:true,value:c.name},
      {k:'category',label:'Category',type:'select',required:true,options:CATEGORIES,value:c.category},
      {k:'status',label:'Status',type:'select',required:true,options:CO_STATUS,value:c.status},
      {k:'owner',label:'Owner',type:'select',required:true,options:['A. Trainee','A. Rao','M. Silva'],value:c.owner},
      {k:'employees',label:'Number of employees',type:'text',value:c.employees}
    ],
    validate:function(v){
      var e={};
      var liveJobs=coJobs(c.id).filter(function(j){return openJobs().indexOf(j)>=0;});
      if(v.status==='Archive'&&liveJobs.length)
        e.status='This company has '+liveJobs.length+' live job order(s). Close or reassign them before archiving the account.';
      return e;
    },
    submit:'Save changes',
    onSubmit:function(v){
      diffLog('Company',c.name,[['name',c.name,v.name],['category',c.category,v.category],
        ['status',c.status,v.status],['owner',c.owner,v.owner],['employees',c.employees,v.employees]]);
      c.name=v.name;c.category=v.category;c.status=v.status;c.owner=v.owner;c.employees=v.employees||'—';
      render();
    }});
};

A.editContact=function(id){
  var t=byId(DB.contacts,id);
  if(!t)return;
  openForm({title:'Edit Contact',
    intro:'This person receives sendouts. A stale phone number or a departed contact is the commonest cause of a pipeline going quiet.',
    note:t.name+' · '+t.id,
    fields:[
      {k:'name',label:'Contact name',type:'text',required:true,value:t.name},
      {k:'title',label:'Title',type:'text',required:true,value:t.title},
      {k:'status',label:'Status',type:'select',required:true,options:['Active','Archive'],value:t.status},
      {k:'primary',label:'Primary contact for this company',type:'check',value:!!t.primary},
      {k:'phone',label:'Phone',type:'text',required:true,value:t.phone},
      {k:'email',label:'Email',type:'text',required:true,value:t.email},
      {k:'owner',label:'Owner',type:'select',required:true,options:['A. Trainee','A. Rao','M. Silva'],value:t.owner}
    ],
    validate:function(v){
      var e={};
      if(v.email&&v.email.indexOf('@')<0)e.email='Enter a full email address.';
      var liveJobs=DB.jobs.filter(function(j){return j.contactId===t.id&&openJobs().indexOf(j)>=0;});
      if(v.status==='Archive'&&liveJobs.length)
        e.status='This contact is named on '+liveJobs.length+' live job order(s). Reassign the job orders to another contact before archiving.';
      return e;
    },
    submit:'Save changes',
    onSubmit:function(v){
      diffLog('Contact',t.name,[['name',t.name,v.name],['title',t.title,v.title],
        ['status',t.status,v.status],['primary',t.primary?'yes':'no',v.primary?'yes':'no'],
        ['phone',t.phone,v.phone],['email',t.email,v.email],['owner',t.owner,v.owner]]);
      if(v.primary&&!t.primary)coContacts(t.companyId).forEach(function(x){if(x.id!==t.id)x.primary=false;});
      t.name=v.name;t.title=v.title;t.status=v.status;t.primary=!!v.primary;
      t.phone=v.phone;t.email=v.email;t.owner=v.owner;
      render();
    }});
};

A.editJob=function(id){
  var j=byId(DB.jobs,id);
  if(!j)return;
  var times=DB.times.filter(function(t){
    return DB.placements.some(function(p){return p.id===t.placementId&&p.jobId===j.id;});});
  var sent=jobSubs(j.id).filter(function(s){return !!s.sendoutAt;});
  openForm({title:'Edit Job Order',
    intro:'Rates and openings on a job order are the ceiling for everything already in the pipeline. Lowering either after sendouts have gone out creates a conflict you will have to explain to the client.',
    note:j.title+' · '+j.id+' · '+j.filled+' of '+j.openings+' filled · '+sent.length+' sendout(s)',
    fields:[
      {k:'title',label:'Job title',type:'text',required:true,value:j.title},
      {k:'contactId',label:'Contact',type:'select',required:true,value:j.contactId,
        options:coContacts(j.companyId).map(function(c){return {v:c.id,t:c.name+' · '+c.title};})},
      {k:'type',label:'Job order type',type:'select',required:true,options:JO_TYPE,value:j.type,reRender:true},
      {k:'category',label:'Category',type:'select',required:true,options:CATEGORIES,value:j.category},
      {k:'openings',label:'Openings',type:'number',required:true,minNum:1,value:j.openings},
      {k:'employmentType',label:'Employment type',type:'select',required:true,
        value:j.employmentType||(j.type==='Direct Hire'?'Permanent':'W2'),
        optionsFrom:function(v){return EMP_BY_TYPE[v.type]||EMP_TYPE;}},
      {k:'payRate',label:'Pay rate per hour',type:'number',minNum:0,value:j.payRate},
      {k:'billRate',label:'Bill rate per hour',type:'number',minNum:0,value:j.billRate},
      {k:'salary',label:'Salary',type:'number',minNum:0,value:j.salary||''},
      {k:'flatFee',label:'Flat fee',type:'number',minNum:0,value:j.flatFee||''},
      {k:'location',label:'Location',type:'text',required:true,value:j.location},
      {k:'startDate',label:'Anticipated start date',type:'date',required:true,value:j.startDate},
      {k:'duration',label:'Duration',type:'text',required:true,value:j.duration},
      {k:'description',label:'Job description',type:'textarea',required:true,min:40,value:j.description},
      {k:'ack',label:'The client has agreed this variation',type:'check'}
    ],
    validate:function(v){
      var e={};
      if(v.type==='Direct Hire'){
        if(!v.salary)e.salary='HARD STOP: a direct hire needs a salary.';
      } else if(Number(v.billRate)<=Number(v.payRate))
        e.billRate='HARD STOP: bill rate must exceed pay rate.';
      if(Number(v.openings)<j.filled)
        e.openings='There are already '+j.filled+' placement(s) against this job order. Openings cannot go below that.';
      var lowering=Number(v.billRate)<j.billRate;
      if(!e.billRate&&lowering&&sent.length&&!v.ack)
        e.billRate='You are lowering the bill rate below what '+sent.length+
          ' live sendout(s) were priced at. Confirm the client has agreed the variation, or those submissions will sit above the job order ceiling.';
      if(v.type==='Direct Hire'&&j.type!=='Direct Hire'&&times.length)
        e.type='This job order already has '+times.length+' time entr(ies) against it. A direct hire carries no hours, so the type cannot be changed now.';
      return e;
    },
    submit:'Save changes',
    onSubmit:function(v){
      diffLog('Job Order',j.title,[['title',j.title,v.title],['contact',ctName(j.contactId),ctName(v.contactId)],
        ['type',j.type,v.type],['category',j.category,v.category],['openings',j.openings,Number(v.openings)],
        ['pay rate',j.payRate,Number(v.payRate)],['bill rate',j.billRate,Number(v.billRate)],
        ['location',j.location,v.location],['start date',j.startDate,v.startDate],
        ['duration',j.duration,v.duration],
        ['description',j.description.length+' chars',v.description.length+' chars']]);
      j.title=v.title;j.contactId=v.contactId;j.type=v.type;j.category=v.category;
      j.openings=Number(v.openings);j.payRate=Number(v.payRate)||0;j.billRate=Number(v.billRate)||0;
      j.salary=Number(v.salary)||0;j.flatFee=Number(v.flatFee)||0;j.employmentType=v.employmentType;
      j.location=v.location;j.startDate=v.startDate;j.duration=v.duration;j.description=v.description;
      if(j.status==='Filled'&&j.filled<j.openings)j.status='Accepting Candidates';
      render();
    }});
};

A.editLead=function(id){
  var l=byId(DB.leads,id);
  if(!l)return;
  openForm({title:'Edit Lead',note:l.name+' · '+l.id,
    intro:'A lead can be corrected freely until it is converted. After conversion the company and contact records carry the truth.',
    fields:[
      {k:'name',label:'Lead name',type:'text',required:true,value:l.name},
      {k:'company',label:'Company',type:'text',required:true,value:l.company},
      {k:'title',label:'Title',type:'text',required:true,value:l.title},
      {k:'status',label:'Status',type:'select',required:true,options:LEAD_STATUS,value:l.status},
      {k:'source',label:'Source',type:'select',required:true,value:l.source,
        options:['Inbound web','Referral','Outbound call','Event','Job Board']},
      {k:'notes',label:'Qualification notes',type:'textarea',required:true,min:30,value:l.notes}
    ],
    validate:function(v){
      var e={};
      if(l.status==='Converted'&&v.status!=='Converted')
        e.status='This lead has already been converted. Reverting the status would hide the company and contact it created.';
      if(v.status==='Converted'&&l.status!=='Converted')
        e.status='Use Convert Lead rather than setting this status by hand, so the company and contact are actually created.';
      return e;
    },
    submit:'Save changes',
    onSubmit:function(v){
      diffLog('Lead',l.name,[['name',l.name,v.name],['company',l.company,v.company],
        ['title',l.title,v.title],['status',l.status,v.status],['source',l.source,v.source],
        ['notes',l.notes.length+' chars',v.notes.length+' chars']]);
      l.name=v.name;l.company=v.company;l.title=v.title;l.status=v.status;l.source=v.source;l.notes=v.notes;
      render();
    }});
};

A.editOpp=function(id){
  var o=byId(DB.opps,id);
  if(!o)return;
  openForm({title:'Edit Opportunity',note:o.title+' · '+o.id,
    intro:'Value and probability feed the forecast. Moving either without a reason is how a forecast stops being believed.',
    fields:[
      {k:'title',label:'Title',type:'text',required:true,value:o.title},
      {k:'contactId',label:'Contact',type:'select',required:true,value:o.contactId,
        options:coContacts(o.companyId).map(function(c){return {v:c.id,t:c.name+' · '+c.title};})},
      {k:'type',label:'Type',type:'select',required:true,options:JO_TYPE,value:o.type},
      {k:'status',label:'Status',type:'select',required:true,options:OPP_STATUS,value:o.status},
      {k:'value',label:'Estimated annual value',type:'number',required:true,minNum:1,value:o.value},
      {k:'probability',label:'Probability %',type:'number',required:true,minNum:0,value:o.probability},
      {k:'closeDate',label:'Expected close date',type:'date',required:true,value:o.closeDate}
    ],
    validate:function(v){
      var e={};
      if(Number(v.probability)>100)e.probability='Probability cannot exceed 100 per cent.';
      if(o.jobId&&v.status!=='Won')
        e.status='This opportunity was converted to job order '+o.jobId+'. Changing it away from Won would double count the revenue.';
      if(v.status==='Won'&&!o.jobId)
        e.status='Use Convert to Job Order rather than marking this Won by hand, so a job order actually exists to recruit against.';
      return e;
    },
    submit:'Save changes',
    onSubmit:function(v){
      diffLog('Opportunity',o.title,[['title',o.title,v.title],['contact',ctName(o.contactId),ctName(v.contactId)],
        ['type',o.type,v.type],['status',o.status,v.status],['value',o.value,Number(v.value)],
        ['probability',o.probability,Number(v.probability)],['close date',o.closeDate,v.closeDate]]);
      o.title=v.title;o.contactId=v.contactId;o.type=v.type;o.status=v.status;
      o.value=Number(v.value);o.probability=Number(v.probability);o.closeDate=v.closeDate;
      render();
    }});
};

A.editPlacement=function(id){
  var p=byId(DB.placements,id);
  if(!p)return;
  var approved=p.status==='Approved';
  var hours=DB.times.filter(function(t){return t.placementId===p.id;});
  var billed=hours.filter(function(t){return t.status==='Approved';});
  openForm({title:'Edit Placement',
    intro:approved
      ?'This placement is approved and billable. Changing rates or dates voids that approval and sends it back to Pending Approval, because the signed figures no longer match.'
      :'Rates and dates must match the signed contract before this can be approved.',
    note:candName(p.candidateId)+' · '+p.id+' · '+billed.length+' approved week(s) already billed',
    fields:[
      {k:'employmentType',label:'Employment type',type:'select',required:true,options:EMP_TYPE,value:p.employmentType},
      {k:'start',label:'Start date',type:'date',required:true,value:p.start},
      {k:'end',label:'End date',type:'date',required:true,value:p.end},
      {k:'payRate',label:'Pay rate per hour',type:'number',required:true,minNum:1,value:p.payRate},
      {k:'billRate',label:'Bill rate per hour',type:'number',required:true,minNum:1,value:p.billRate},
      {k:'status',label:'Status',type:'select',required:true,options:PL_STATUS,value:p.status},
      {k:'ack',label:'I understand that changing rates or dates voids the existing approval',type:'check'}
    ],
    validate:function(v){
      var e={};
      if(Number(v.billRate)<=Number(v.payRate))e.billRate='Bill rate must exceed pay rate.';
      if(v.end&&new Date(v.end)<=new Date(v.start))
        e.end='HARD STOP: end date must be after the start date.';
      var ratesMoved=Number(v.payRate)!==p.payRate||Number(v.billRate)!==p.billRate||v.start!==p.start;
      if(approved&&ratesMoved&&!v.ack)
        e.ack='Confirm this before changing an approved placement.';
      if(billed.length&&Number(v.payRate)!==p.payRate)
        e.payRate=billed.length+' week(s) have already been approved at '+money(p.payRate)+
          '. Changing the pay rate retrospectively would misstate what has been paid. Raise an adjustment instead.';
      if(!p.perm&&v.status==='Approved'&&margin(Number(v.payRate),Number(v.billRate))<10)
        e.status='Gross margin would be '+margin(Number(v.payRate),Number(v.billRate))+
          '%, below the 10% threshold. This cannot be set to Approved.';
      return e;
    },
    submit:'Save changes',
    onSubmit:function(v){
      var ratesMoved=Number(v.payRate)!==p.payRate||Number(v.billRate)!==p.billRate||v.start!==p.start;
      diffLog('Placement',candName(p.candidateId),[['employment type',p.employmentType,v.employmentType],
        ['start',p.start,v.start],['end',p.end,v.end],['pay rate',p.payRate,Number(v.payRate)],
        ['bill rate',p.billRate,Number(v.billRate)],['status',p.status,v.status]]);
      p.employmentType=v.employmentType;p.start=v.start;p.end=v.end;
      p.payRate=Number(v.payRate);p.billRate=Number(v.billRate);p.status=v.status;
      if(approved&&ratesMoved&&p.status==='Approved'){
        p.status='Pending Approval';p.approvedBy=null;
        log('Placement approval voided',candName(p.candidateId)+' — rates or start date changed after approval');
        toast('Approval voided, back to Pending Approval','no');
      }
      if(p.status!=='Approved')p.approvedBy=null;
      render();
    }});
};

A.editTearsheet=function(id){
  var t=byId(DB.tearsheets,id);
  if(!t)return;
  openForm({title:'Edit Tearsheet',note:t.name+' · '+t.id,
    fields:[
      {k:'name',label:'Name',type:'text',required:true,value:t.name},
      {k:'description',label:'Description',type:'textarea',required:true,min:25,value:t.description},
      {k:'owner',label:'Owner',type:'select',required:true,options:['A. Trainee','A. Rao','M. Silva'],value:t.owner}
    ],
    submit:'Save changes',
    onSubmit:function(v){
      diffLog('Tearsheet',t.name,[['name',t.name,v.name],
        ['description',t.description.length+' chars',v.description.length+' chars'],['owner',t.owner,v.owner]]);
      t.name=v.name;t.description=v.description;t.owner=v.owner;render();
    }});
};
A.removeFromTearsheet=function(trId,candId){
  var t=byId(DB.tearsheets,trId);
  if(!t)return;
  t.candidateIds=t.candidateIds.filter(function(x){return x!==candId;});
  log('Removed from Tearsheet',candName(candId)+' ← '+t.name);
  toast('Removed from tearsheet','');render();
};

A.editTask=function(id){
  var t=byId(DB.tasks,id);
  if(!t)return;
  openForm({title:'Edit Task',note:t.id,
    fields:[
      {k:'subject',label:'Subject',type:'text',required:true,value:t.subject},
      {k:'due',label:'Due date',type:'date',required:true,value:t.due},
      {k:'priority',label:'Priority',type:'select',required:true,options:['High','Medium','Low'],value:t.priority},
      {k:'entity',label:'Related record',type:'text',value:t.entity}
    ],
    submit:'Save changes',
    onSubmit:function(v){
      diffLog('Task',t.subject,[['subject',t.subject,v.subject],['due',t.due,v.due],
        ['priority',t.priority,v.priority],['related record',t.entity,v.entity]]);
      t.subject=v.subject;t.due=v.due;t.priority=v.priority;t.entity=v.entity||'';render();
    }});
};

A.editNote=function(id){
  var n=byId(DB.notes,id);
  if(!n)return;
  openForm({title:'Edit Note',
    intro:'Notes are an audit record. Correcting a typo is fine; rewriting what was said is not, and the edit is logged either way.',
    note:n.action+' · '+fmtDT(n.at),
    fields:[
      {k:'action',label:'Action',type:'select',required:true,options:NOTE_ACTIONS,value:n.action},
      {k:'text',label:'Comments',type:'textarea',required:true,min:25,value:n.text}
    ],
    submit:'Save changes',
    onSubmit:function(v){
      diffLog('Note',n.id,[['action',n.action,v.action],
        ['comments',n.text.length+' chars',v.text.length+' chars']]);
      n.action=v.action;n.text=v.text;n.editedAt=new Date().toISOString();render();
    }});
};

/* ================================================================ CV upload */
A.uploadCV=function(id){
  var c=byId(DB.candidates,id);
  if(!c)return;
  var root=document.getElementById('modal-root');
  var pending={name:c.cvName||'',text:c.cv||''};
  root.innerHTML='<div class="scrim" data-scrim><div class="modal wide" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>'+(c.cv?'Replace CV':'Upload CV')+'</h4>'+
      '<p>'+esc(c.name)+' · '+esc(c.id)+'</p></div>'+
    '<div class="modal-b">'+
      '<div class="callout">The searchable copy is the text, not the file. A CV attached without extractable text is invisible to boolean search, which is the same as not having it.</div>'+
      '<div class="f"><label for="cv-file">Choose a file</label>'+
        '<input type="file" id="cv-file" accept=".txt,.md,.text,.csv,.rtf,.doc,.docx,.pdf">'+
        '<div class="hint">Plain text is read automatically. For .pdf, .doc and .docx the file name is kept and you paste the text below, because reliable extraction needs a server.</div></div>'+
      '<div class="f"><label for="cv-text">CV text <span>required</span></label>'+
        '<textarea id="cv-text" style="min-height:220px;font-family:var(--mono);font-size:12px">'+esc(pending.text)+'</textarea>'+
        '<div class="hint" id="cv-count">'+(pending.text?pending.text.split(/\s+/).filter(Boolean).length+' words':'No text yet')+'</div>'+
        '<div class="err" id="cv-err" style="display:none"></div></div>'+
    '</div>'+
    '<div class="modal-f"><button class="btn ghost" data-close>Cancel</button>'+
      '<button class="btn" data-cvsave>Save CV</button></div></div></div>';
  var ta=document.getElementById('cv-text');
  var cnt=document.getElementById('cv-count');
  var err=document.getElementById('cv-err');
  function count(){
    var w=ta.value.split(/\s+/).filter(Boolean).length;
    cnt.textContent=(pending.name?pending.name+' · ':'')+(w?w+' words':'No text yet');
  }
  ta.addEventListener('input',function(){pending.text=ta.value;count();});
  document.getElementById('cv-file').addEventListener('change',function(e){
    var f=e.target.files&&e.target.files[0];
    if(!f)return;
    pending.name=f.name;
    Store.putFile(c.id+'/'+f.name,f);
    var textual=/\.(txt|md|text|csv|rtf)$/i.test(f.name)||/^text\//.test(f.type||'');
    if(!textual){
      count();
      toast('File kept. Paste the text so it becomes searchable.','');
      return;
    }
    var fr=new FileReader();
    fr.onload=function(){
      ta.value=String(fr.result||'').replace(/\r\n/g,'\n');
      pending.text=ta.value;count();
      toast('Text extracted from '+f.name,'ok');
    };
    fr.onerror=function(){toast('Could not read that file','no');};
    fr.readAsText(f);
  });
  root.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('click',function(){root.innerHTML='';});});
  root.querySelector('[data-cvsave]').addEventListener('click',function(){
    var txt=ta.value.trim();
    if(txt.length<80){
      err.style.display='block';
      err.textContent='Needs at least 80 characters of CV text to be worth searching. Currently '+txt.length+'.';
      return;
    }
    var had=!!c.cv;
    c.cv=txt;c.cvName=pending.name||(c.name.replace(/[^A-Za-z]+/g,'_')+'_CV.txt');
    c.cvAt=iso(TODAY);
    addFile(c,c.cvName,'Resume',true,txt);
    Store.markCV(c.id);
    log(had?'Replaced the resume file':'Attached a resume file',
      c.name+' · '+c.cvName+' · '+txt.split(/\s+/).filter(Boolean).length+' words');
    root.innerHTML='';
    toast('File attached. Use Parse as Existing to update the record from it.','ok');
    go('candidate',c.id,'files');
  });
  root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
    if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
};

/* ================================================================ search state */
var searchQ='';
var searchRun=null;
var searchSel={};
var searchFocus=false;

var JOB_STOP={the:1,and:1,for:1,with:1,'of':1,'to':1,'in':1,'on':1,senior:1,junior:1,ii:1,iii:1};
A.jobSearch=function(id){
  var j=byId(DB.jobs,id);
  if(!j)return;
  var words=String(j.title).toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/)
    .filter(function(w){return w.length>2&&!JOB_STOP[w];});
  var uniq=[];
  words.forEach(function(w){if(uniq.indexOf(w)<0)uniq.push(w);});
  var terms=uniq.slice(0,4).map(function(w){return w+'*';});
  var q='('+(terms.length?terms.join(' OR '):'"'+j.title+'"')+') AND category:"'+j.category+
    '" NOT status:archive';
  route={view:'search',id:null,tab:null};
  menuOpen=false;
  A.runSearch(q);
  toast('Starting query built from the job order — now refine it','');
};
A.runSearch=function(q){
  searchQ=(q!=null?q:searchQ);
  if(!String(searchQ).trim()){searchRun=null;render();return;}
  try{
    var r=bsSearch(searchQ);
    searchSel={};
    searchRun={ok:true,explain:r.explain,rows:r.rows,q:searchQ};
    log('Ran boolean search',searchQ+' → '+r.rows.length+' result(s)');
  }catch(e){
    searchRun={ok:false,error:e.message||String(e),q:searchQ,rows:[]};
  }
  render();
};
A.saveSearch=function(){
  if(!searchRun||!searchRun.ok){toast('Run a valid search first','no');return;}
  openForm({title:'Save this search',
    intro:'A saved search is a standing query you re-run rather than retype. Named by requirement it stays useful; named by date it does not.',
    note:searchRun.q,
    fields:[{k:'name',label:'Name',type:'text',required:true,
      hint:'For example "IT — AWS and Kubernetes, contract".'}],
    submit:'Save search',
    onSubmit:function(v){
      DB.savedSearches.push({id:uid('SS'),name:v.name,q:searchRun.q,owner:'A. Trainee',
        added:iso(TODAY),mine:true});
      log('Saved search',v.name+' · '+searchRun.q);
      toast('Search saved','ok');render();
    }});
};
A.deleteSearch=function(id){
  var s=byId(DB.savedSearches,id);
  DB.savedSearches=DB.savedSearches.filter(function(x){return x.id!==id;});
  if(s)log('Deleted saved search',s.name);
  render();
};
var candSel={};
function selStore(){return route.view==='search'?searchSel:candSel;}
A.selectedIds=function(){
  var st=selStore();
  return Object.keys(st).filter(function(k){return st[k];});
};
A.toggleSel=function(id){var st=selStore();st[id]=!st[id];render();};
A.selectAll=function(ids,on){
  var st=selStore();
  ids.forEach(function(id){if(on)st[id]=true;else delete st[id];});
  render();
};
function selBox(id,on,name){
  var what=name?('Select '+name):'Select this record';
  return '<span class="selbox'+(on?' on':'')+'" data-act="sel" data-id="'+id+
    '" role="checkbox" tabindex="0" aria-checked="'+(!!on)+'" '+
    'aria-label="'+esc(what)+'" title="'+esc(what)+'">'+(on?'\u2713':'')+'</span>';
}
function selBar(n,extra){
  if(!n)return '';
  return '<div class="selbar"><b>'+n+' selected</b>'+
    '<button class="btn sm" data-act="mass-update">Mass Update</button>'+
    '<button class="btn ghost sm" data-act="mass-pipeline">Add to Job</button>'+
    '<button class="btn ghost sm" data-act="mass-tearsheet">Add to Tearsheet</button>'+
    '<button class="btn ghost sm" data-act="mass-note">Add Note</button>'+
    (extra||'')+
    '<span class="sp"></span>'+
    '<button class="btn ghost sm" data-act="sel-none">Clear</button></div>';
}
A.massNote=function(){
  var ids=A.selectedIds();
  if(!ids.length){toast('Select some records first','no');return;}
  openForm({title:'Add a note to '+ids.length+' candidate(s)',
    intro:'The same note is written to every selected record. Use it for a campaign or a bulk call-out, not for anything specific to one person.',
    fields:[
      {k:'action',label:'Action',type:'select',required:true,options:NOTE_ACTIONS,value:'Other'},
      {k:'text',label:'Comments',type:'textarea',required:true,min:25}
    ],
    submit:'Add to '+ids.length+' record(s)',
    onSubmit:function(v){
      ids.forEach(function(id){
        DB.notes.push({id:uid('NT'),action:v.action,text:v.text,at:new Date().toISOString(),
          by:'A. Trainee',links:{candidateId:id},mine:true});
      });
      log('Bulk note — '+ids.length+' candidates',v.action+': '+v.text.slice(0,60));
      toast('Note added to '+ids.length+' records','ok');
      if(route.view==='search')searchSel={};else candSel={};
      render();
    }});
};
A.massTearsheet=function(){
  var ids=A.selectedIds();
  if(!ids.length){toast('Select some candidates first','no');return;}
  if(!DB.tearsheets.length){toast('Create a tearsheet first','no');return;}
  openForm({title:'Add '+ids.length+' candidate(s) to a tearsheet',
    intro:'Mass actions are where a good search pays off. Anything already on the list is skipped rather than duplicated.',
    fields:[{k:'trId',label:'Tearsheet',type:'select',required:true,
      options:DB.tearsheets.map(function(t){return {v:t.id,t:t.name+' ('+t.candidateIds.length+')'};})}],
    submit:'Add to tearsheet',
    onSubmit:function(v){
      var t=byId(DB.tearsheets,v.trId),added=0,skipped=0;
      ids.forEach(function(id){
        if(t.candidateIds.indexOf(id)>=0){skipped++;return;}
        t.candidateIds.push(id);added++;
      });
      log('Mass added to Tearsheet',added+' added, '+skipped+' already present · '+t.name);
      toast(added+' added'+(skipped?', '+skipped+' skipped':''),'ok');
      searchSel={};render();
    }});
};
A.massPipeline=function(){
  var ids=A.selectedIds();
  if(!ids.length){toast('Select some candidates first','no');return;}
  var jobs=addableJobs();
  if(!jobs.length){toast('No job order is accepting candidates','no');return;}
  openForm({title:'Add '+ids.length+' candidate(s) to a pipeline',
    intro:'Each candidate is checked individually. Anyone already on the pipeline, or set to Do Not Call or Archive, is skipped and reported rather than forced through.',
    fields:[{k:'jobId',label:'Job order',type:'select',required:true,
      options:jobs.map(function(j){return {v:j.id,t:j.title+' · '+coName(j.companyId)};})}],
    submit:'Add to pipeline',
    onSubmit:function(v){
      var added=0,dup=0,blocked=0,names=[];
      ids.forEach(function(id){
        var c=byId(DB.candidates,id);
        if(!c)return;
        if(['Do Not Call','Archive'].indexOf(c.status)>=0){blocked++;names.push(c.name+' ('+c.status+')');return;}
        if(DB.subs.some(function(s){return s.jobId===v.jobId&&s.candidateId===id;})){dup++;return;}
        var now=new Date().toISOString();
        DB.subs.push({id:uid('SB'),jobId:v.jobId,candidateId:id,status:'New Lead',owner:'A. Trainee',
          added:now,modified:now,history:[{status:'New Lead',at:now,by:'A. Trainee'}],mine:true,
          screenNote:'',summary:'',payRate:null,billRate:null,sentTo:null,sendoutAt:null,
          apptId:null,startDate:null,reason:null});
        added++;
      });
      log('Mass added to pipeline',added+' added, '+dup+' duplicates, '+blocked+' blocked · '+jobName(v.jobId));
      searchSel={};
      openInfo('Added '+added+' of '+ids.length,
        added+' added at New Lead. '+dup+' were already on this pipeline. '+blocked+' were blocked by status.',
        names.length?'<ul style="margin:0;padding-left:18px">'+names.map(function(n){
          return '<li>'+esc(n)+' — cannot be submitted</li>';}).join('')+'</ul>':'',
        blocked?'warn':'ok');
      render();
    }});
};

/* ================================================================ search view */
function vSearch(){
  var r=searchRun;
  var withCV=DB.candidates.filter(function(c){return !!c.cv;}).length;
  var byCat={};
  DB.candidates.forEach(function(c){byCat[c.category]=(byCat[c.category]||0)+1;});
  var sel=A.selectedIds();

  var results='';
  if(r&&!r.ok){
    results='<div class="callout bad"><b>The query could not be read.</b> '+esc(r.error)+'</div>';
  } else if(r&&r.ok){
    var rows=r.rows.slice(0,120);
    results='<div class="callout"><b>Read as:</b> '+esc(r.explain)+'</div>'+
      '<div class="h" style="margin-bottom:9px"><h3 style="margin:0;font-size:14px;font-weight:600">'+
        r.rows.length+' result'+(r.rows.length===1?'':'s')+
        (r.rows.length>120?' <em style="font-style:normal;color:var(--ink3);font-weight:400">· showing the first 120</em>':'')+
        '</h3><span class="sp"></span><div class="btnrow">'+
        '<button class="btn ghost sm" data-act="save-search">Save this search</button>'+
        '<button class="btn ghost sm" data-act="mass-tearsheet">Add selected to tearsheet'+(sel.length?' ('+sel.length+')':'')+'</button>'+
        '<button class="btn ghost sm" data-act="mass-update">Mass update'+(sel.length?' ('+sel.length+')':'')+'</button>'+
        '<button class="btn sm" data-act="mass-pipeline">Add selected to pipeline'+(sel.length?' ('+sel.length+')':'')+'</button>'+
      '</div></div>'+
      (r.rows.length?'<div class="tw"><table><thead><tr><th style="width:30px"></th><th>Candidate</th>'+
        '<th>Occupation</th><th>Category</th><th>Status</th><th>Location</th><th class="num">Rate</th>'+
        '<th>Availability</th><th>CV</th><th>Matched on</th></tr></thead><tbody>'+
        rows.map(function(x){
          var c=x.c,on=!!searchSel[c.id];
          return '<tr'+(on?' class="sel"':'')+'><td>'+selBox(c.id,on,c.name)+'</td>'+
            '<td><span class="qv" data-act="peek" data-type="candidate" data-id="'+c.id+
              '" role="button" tabindex="0" title="Quick view">\u25CE</span> '+
              '<span class="lnk" data-go="candidate" data-id="'+c.id+'">'+esc(c.name)+'</span></td>'+
            '<td class="muted">'+esc(c.occupation)+'</td>'+
            '<td class="muted" style="font-size:12px">'+esc(c.category)+'</td>'+
            '<td>'+cdPill(c)+'</td><td class="muted">'+esc(c.location)+'</td>'+
            '<td class="num">'+money(c.desiredRate)+'</td><td>'+esc(c.availability)+'</td>'+
            '<td>'+(c.cv?'<span class="pill p-good">yes</span>':'<span class="pill p-flat">none</span>')+'</td>'+
            '<td style="font-size:11.5px">'+(x.hits.length?x.hits.slice(0,6).map(function(h){
              return '<span class="tag">'+esc(h)+'</span>';}).join(''):'<span class="muted">—</span>')+'</td></tr>';
        }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>No candidates match</b>Loosen the query: swap an AND for an OR, or add a wildcard.</div>');
  }

  return '<div class="h"><h2>Candidate Search</h2><span class="sp"></span>'+
    '<button class="btn ghost" data-act="add-candidate">Add Candidate</button></div>'+
    '<p class="sub">'+DB.candidates.length+' candidate records · '+withCV+' with a searchable CV · '+
      Object.keys(byCat).map(function(k){return esc(k)+' '+byCat[k];}).join(' · ')+'</p>'+

    '<div class="card"><div class="card-b">'+
      '<div class="f" style="margin-bottom:9px"><label for="bs-q">Boolean query</label>'+
      '<input type="text" id="bs-q" value="'+esc(searchQ)+'" placeholder="(java OR &quot;spring boot&quot;) AND aws NOT contractor" autocomplete="off">'+
      '<div class="hint">Enter runs the search. Operators are case insensitive; two terms side by side are treated as AND.</div></div>'+
      '<div class="btnrow"><button class="btn" data-act="run-search">Search</button>'+
      '<button class="btn ghost" data-act="clear-search">Clear</button></div>'+
    '</div></div>'+

    '<div class="sec grid g2">'+
      '<div class="card"><div class="card-h"><h4>Query syntax</h4></div><div class="card-b">'+
        '<div class="tw"><table><tbody>'+[
          ['<code>nurse</code>','the whole word only — will not match “nurses”'],
          ['<code>nurs*</code>','wildcard — nurse, nurses, nursing'],
          ['<code>"spring boot"</code>','exact phrase, in that order'],
          ['<code>java AND aws</code>','both must appear'],
          ['<code>java OR python</code>','either will do'],
          ['<code>nurse NOT paediatric</code>','exclude; <code>-paediatric</code> does the same'],
          ['<code>(a OR b) AND c</code>','brackets control the order'],
          ['<code>skills:kubernetes</code>','restrict to one field'],
          ['<code>status:active</code>','other fields: name, title, location, source, category, cv, rate, availability, owner'],
          ['<code>category:"Light Industrial"</code>','quote the value when it contains a space']
        ].map(function(x){
          return '<tr><td style="width:170px;font-family:var(--mono);font-size:12px">'+x[0]+'</td>'+
            '<td class="muted">'+esc(x[1])+'</td></tr>';
        }).join('')+'</tbody></table></div>'+
        '<div class="btnrow" style="margin-top:11px">'+[
          '(java OR "spring boot") AND aws',
          'forklift AND (reach OR "order picker") NOT welder',
          'skills:epic AND ("med-surg" OR telemetry) AND status:active',
          'excel AND (payroll OR "accounts payable") NOT temp'
        ].map(function(q){
          return '<button class="btn ghost sm" data-act="try-search" data-q="'+esc(q)+'">'+esc(q)+'</button>';
        }).join('')+'</div>'+
      '</div></div>'+
      '<div class="card"><div class="card-h"><h4>Saved searches</h4><span class="sp"></span>'+
        '<span class="muted mono">'+DB.savedSearches.length+'</span></div>'+
        (DB.savedSearches.length?'<table><tbody>'+DB.savedSearches.map(function(s){
          return '<tr><td><span class="lnk" data-act="try-search" data-q="'+esc(s.q)+'">'+esc(s.name)+'</span>'+
            '<div class="muted mono" style="font-size:11px">'+esc(s.q)+'</div></td>'+
            '<td style="width:60px;text-align:right"><span class="lnk" data-act="del-search" data-id="'+s.id+'">delete</span></td></tr>';
        }).join('')+'</tbody></table>'
        :'<div class="card-b"><div class="muted" style="font-size:13px">Nothing saved yet. Run a query that works, then save it so the next person does not have to reinvent it.</div></div>')+
      '</div>'+
    '</div>'+

    (results?'<div class="sec">'+results+'</div>':'');
}

/* ================================================================ database view */
function vData(){
  var counts=[['Leads',DB.leads.length],['Opportunities',DB.opps.length],['Companies',DB.companies.length],
    ['Contacts',DB.contacts.length],['Job orders',DB.jobs.length],['Candidates',DB.candidates.length],
    ['CVs on file',DB.candidates.filter(function(c){return !!c.cv;}).length],
    ['Submissions',DB.subs.length],['Appointments',DB.appts.length],['Placements',DB.placements.length],
    ['Time entries',DB.times.length],['Notes',DB.notes.length],['Tasks',DB.tasks.length],
    ['Tearsheets',DB.tearsheets.length],['Saved searches',DB.savedSearches.length]];
  var cvBytes=0,recs=0;
  DB.candidates.forEach(function(c){
    cvBytes+=(c.cv||'').length;
    (c.files||[]).forEach(function(f){cvBytes+=(f.text||'').length;});
  });
  counts.forEach(function(c){recs+=c[1];});
  var size=cvBytes+recs*260;
  return '<div class="h"><h2>Database</h2><span class="sp"></span><div class="btnrow">'+
    '<button class="btn ghost" data-act="db-export">Export</button>'+
    '<button class="btn ghost" data-act="db-import">Import</button>'+
    '<button class="btn" data-act="db-save">Save now</button></div></div>'+
    '<p class="sub">Everything in this sandbox is stored in your own browser. No server, no account, no installation.</p>'+

    '<div class="grid g4">'+
      met('Storage',Store.available?'Active':'Memory only',Store.available?'IndexedDB in this browser':'nothing will survive a refresh',Store.available?'up':'dn')+
      met('Last saved',Store.lastSaved?fmtDT(Store.lastSaved):'—','saves automatically after each change')+
      met('Records',counts.reduce(function(a,c){return a+c[1];},0),'across '+counts.length+' record types')+
      met('Payload',(size/1048576).toFixed(1)+' MB','approximate; '+
        Math.round(cvBytes/1048576*10)/10+' MB of that is resume text')+
    '</div>'+

    (Store.available
      ?'<div class="sec"><div class="callout"><b>Local database active.</b> Data is written to IndexedDB in this browser under the key <span class="mono">recruitment_ats_sandbox</span>. It survives refreshes, closing the tab and restarting the machine. It is per browser and per machine, so it is not shared between trainees — use Export and Import to move a session, or to hand work to a trainer.</div></div>'
      :'<div class="sec"><div class="callout warn"><b>Running in memory only.</b> '+esc(Store.reason)+
        ' Everything works, but a refresh resets it. Browser storage is usually blocked inside a preview frame — download this file and open it directly in Chrome, Edge or Firefox and the local database will switch itself on. Until then, use Export to keep a copy of your work.</div></div>')+

    '<div class="sec grid g2">'+
      '<div class="card"><div class="card-h"><h4>Record counts</h4></div>'+
        '<table><tbody>'+counts.map(function(c){
          return '<tr><td>'+esc(c[0])+'</td><td class="num">'+c[1]+'</td></tr>';
        }).join('')+'</tbody></table></div>'+
      '<div class="card"><div class="card-h"><h4>Managing the data</h4></div><div class="card-b">'+
        '<div class="kv"><dt>Save now</dt><dd style="font-weight:400">Forces an immediate write. Saves happen automatically anyway, about a second after each change.</dd>'+
        '<dt>Export</dt><dd style="font-weight:400">Produces a JSON snapshot to copy or download. This is how a trainee hands a session to a trainer.</dd>'+
        '<dt>Import</dt><dd style="font-weight:400">Replaces everything with a pasted snapshot. Useful for putting a whole cohort on identical starting data.</dd>'+
        '<dt>Clear database</dt><dd style="font-weight:400">Wipes the stored copy and the uploaded files. The screen keeps what is in memory until you reset or refresh.</dd></div>'+
        '<div class="btnrow" style="margin-top:13px">'+
        '<button class="btn ghost sm" data-act="db-reload">Reload from database</button>'+
        '<button class="btn danger sm" data-act="db-clear">Clear database</button></div>'+
      '</div></div>'+
    '</div>';
}
A.dbExport=function(){
  /* A snapshot has to be self-contained, so resumes go back in here even though they are
     stored separately. It is large by nature: warn rather than surprise. */
  var payload=JSON.stringify({savedAt:new Date().toISOString(),version:1,data:DB,seq:SEQ});
  var root=document.getElementById('modal-root');
  root.innerHTML='<div class="scrim" data-scrim><div class="modal wide" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>Export data</h4><p>A complete snapshot including every resume, '+
      (payload.length/1048576).toFixed(1)+' MB.</p></div>'+
    (payload.length>2097152?'<div style="padding:13px 16px 0"><div class="callout warn">'+
      '<b>This is a large snapshot.</b> Download it rather than copying: a few megabytes of text in '+
      'the clipboard is slow and easy to truncate. The size is almost all resume text, which is what '+
      'makes the pool worth practising against.</div></div>':'')+
    '<div class="modal-b"><textarea id="db-json" readonly style="width:100%;min-height:280px;'+
      'font-family:var(--mono);font-size:11px;line-height:1.5;border:1px solid var(--line);border-radius:5px;padding:10px">'+
      esc(payload)+'</textarea></div>'+
    '<div class="modal-f"><button class="btn ghost" data-close>Close</button>'+
      '<button class="btn ghost" data-dl>Download .json</button>'+
      '<button class="btn" data-copy>Copy</button></div></div></div>';
  root.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('click',function(){root.innerHTML='';});});
  root.querySelector('[data-copy]').addEventListener('click',function(){
    var ta=document.getElementById('db-json');ta.select();
    var ok=false;try{ok=document.execCommand('copy');}catch(e){}
    if(!ok&&navigator.clipboard){navigator.clipboard.writeText(payload);ok=true;}
    toast(ok?'Copied':'Select the text and copy manually',ok?'ok':'no');
  });
  root.querySelector('[data-dl]').addEventListener('click',function(){
    try{
      var blob=new Blob([payload],{type:'application/json'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;a.download='ats-sandbox-'+iso(new Date())+'.json';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},2000);
      toast('Download started','ok');
    }catch(e){toast('Download blocked here — use Copy instead','no');}
  });
  root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
    if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
};
A.dbImport=function(){
  openForm({title:'Import data',
    intro:'This replaces every record in the sandbox with the snapshot you paste. Export your current work first if you need it.',
    fields:[
      {k:'json',label:'Paste an exported snapshot',type:'textarea',required:true,min:50},
      {k:'ack',label:'Replace everything currently in the sandbox',type:'check',required:true}
    ],
    validate:function(v){
      var e={};
      try{
        var p=JSON.parse(v.json);
        if(!p||!p.data||!p.data.candidates)e.json='That parsed as JSON but does not look like a sandbox snapshot. It needs a "data" object containing candidates.';
      }catch(err){e.json='Could not parse that as JSON. '+(err.message||'');}
      return e;
    },
    submit:'Import and replace',
    onSubmit:function(v){
      var p=JSON.parse(v.json);
      DB=p.data;
      if(p.seq)SEQ=p.seq;
      ['leads','opps','companies','contacts','candidates','jobs','subs','appts','placements',
       'times','notes','tasks','tearsheets','savedSearches','audit'].forEach(function(k){
        if(!DB[k])DB[k]=[];});
      openTabs=[];searchRun=null;searchSel={};
      log('Imported dataset',DB.candidates.length+' candidates, '+DB.jobs.length+' job orders');
      Store.save(true);
      go('data');
      toast('Data imported','ok');
    }});
};
A.dbClear=function(){
  openForm({title:'Clear the local database',
    intro:'This deletes the stored copy in this browser, including uploaded files. What is on screen stays until you refresh or reset.',
    fields:[{k:'ack',label:'Delete the stored copy',type:'check',required:true}],
    submit:'Clear database',
    onSubmit:function(){
      Store.clear().then(function(){
        log('Cleared local database','');
        toast('Local database cleared','no');render();
      });
    }});
};
A.dbReload=function(){
  Store.load().then(function(rec){
    if(!rec||!rec.data){toast('Nothing stored to reload','no');return;}
    DB=rec.data;if(rec.seq)SEQ=rec.seq;
    openTabs=[];searchRun=null;searchSel={};
    toast('Reloaded from the local database','ok');
    go('data');
  }).catch(function(e){toast('Reload failed: '+(e.message||e),'no');});
};

/* ================================================================ candidate list with paging */
var candPage=1,candFilter='',candCat='All',candStatus='All',candCV='All',candFocus=false;
function vCandidates(){
  var rows=DB.candidates.filter(function(c){
    if(candCat!=='All'&&c.category!==candCat)return false;
    if(candStatus!=='All'&&c.status!==candStatus)return false;
    if(candCV==='With CV'&&!c.cv)return false;
    if(candCV==='No CV'&&c.cv)return false;
    if(candFilter){
      var f=candFilter.toLowerCase();
      if((c.name+' '+c.occupation+' '+c.location+' '+(c.skills||[]).join(' ')).toLowerCase().indexOf(f)<0)return false;
    }
    return true;
  });
  rows=sortRows(rows,'cand');
  var per=25,pages=Math.max(1,Math.ceil(rows.length/per));
  if(candPage>pages)candPage=pages;
  var page=rows.slice((candPage-1)*per,candPage*per);
  return '<div class="h"><h2>Candidates</h2><span class="sp"></span><div class="btnrow">'+
    '<button class="btn ghost" data-go="search">Boolean search</button>'+
    '<button class="btn ghost" data-act="pipeline-add">Add to pipeline</button>'+
    '<button class="btn" data-act="add-candidate">Add Candidate</button></div></div>'+
    '<p class="sub">'+DB.candidates.length+' records. One per person — the duplicate check exists because duplicates break every ratio you are measured on.</p>'+

    '<div class="card" style="margin-bottom:14px"><div class="card-b" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">'+
      '<div class="f" style="margin:0;flex:1;min-width:200px"><label for="cand-filter">Filter by name, title, location or skill</label>'+
        '<input type="text" id="cand-filter" value="'+esc(candFilter)+'" autocomplete="off" placeholder="type and press Enter"></div>'+
      '<div class="f" style="margin:0;width:180px"><label for="cand-cat">Category</label>'+
        '<select id="cand-cat" data-listfilter="cat">'+['All'].concat(CATEGORIES).map(function(k){
          return '<option'+(k===candCat?' selected':'')+'>'+esc(k)+'</option>';}).join('')+'</select></div>'+
      '<div class="f" style="margin:0;width:150px"><label for="cand-status">Status</label>'+
        '<select id="cand-status" data-listfilter="status">'+['All'].concat(CD_STATUS).map(function(k){
          return '<option'+(k===candStatus?' selected':'')+'>'+esc(k)+'</option>';}).join('')+'</select></div>'+
      '<div class="f" style="margin:0;width:130px"><label for="cand-cv">CV</label>'+
        '<select id="cand-cv" data-listfilter="cv">'+['All','With CV','No CV'].map(function(k){
          return '<option'+(k===candCV?' selected':'')+'>'+esc(k)+'</option>';}).join('')+'</select></div>'+
      '<button class="btn ghost" data-act="cand-clear">Reset</button>'+
    '</div></div>'+

    '<p class="sub" style="margin-bottom:9px">'+
      (rows.length?((candPage-1)*per+1)+'\u2013'+Math.min(rows.length,candPage*per)+' of '+rows.length:'0')+
      ' matching'+(rows.length!==DB.candidates.length?' of '+DB.candidates.length+' total':'')+
      ' · sorted by '+esc(SORT.cand.k)+'</p>'+
    selBar(A.selectedIds().length)+
    (page.length?'<div class="tw"><table><thead><tr>'+
      (function(){
        var ids=page.map(function(c){return c.id;});
        var allOn=ids.length&&ids.every(function(i){return candSel[i];});
        return '<th style="width:26px"></th>'+
          '<th style="width:30px"><span class="selbox'+(allOn?' on':'')+'" data-act="sel-all" '+
          'data-ids="'+ids.join(',')+'" data-on="'+(allOn?'0':'1')+'" role="checkbox" tabindex="0" '+
          'aria-checked="'+(!!allOn)+'" title="'+(allOn?'Clear this page':'Select this page')+'">'+
          (allOn?'\u2713':'')+'</span></th>';
      })()+
      sortTh('cand','name','Name')+sortTh('cand','occupation','Occupation')+
      sortTh('cand','category','Category')+sortTh('cand','status','Status')+
      sortTh('cand','location','Location')+sortTh('cand','availability','Availability')+
      sortTh('cand','desiredRate','Rate','num')+sortTh('cand','cv','CV')+
      sortTh('cand','subs','Pipelines','num')+'</tr></thead><tbody>'+
      page.map(function(c){
        return '<tr class="click'+(candSel[c.id]?' sel':'')+'" data-go="candidate" data-id="'+c.id+'">'+
          '<td><span class="qv" data-act="peek" data-type="candidate" data-id="'+c.id+
            '" role="button" tabindex="0" title="Quick view">\u25CE</span></td>'+
          '<td>'+selBox(c.id,!!candSel[c.id],c.name)+'</td>'+
          '<td><span class="lnk">'+esc(c.name)+'</span>'+
          (c.mine?' <span class="tag">yours</span>':'')+'</td>'+
          '<td class="muted">'+esc(c.occupation)+'</td>'+
          '<td class="muted" style="font-size:12px">'+esc(c.category)+'</td>'+
          '<td>'+cdPill(c)+'</td><td class="muted">'+esc(c.location)+'</td>'+
          '<td>'+esc(c.availability)+'</td><td class="num">'+money(c.desiredRate)+'</td>'+
          '<td>'+(c.cv?'<span class="pill p-good">yes</span>':'<span class="pill p-flat">none</span>')+'</td>'+
          '<td class="num">'+candSubs(c.id).length+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      (pages>1?'<div class="btnrow" style="margin-top:12px;align-items:center">'+
        '<button class="btn ghost sm" data-act="cand-page" data-id="1"'+(candPage===1?' disabled':'')+'>First</button>'+
        '<button class="btn ghost sm" data-act="cand-page" data-id="'+(candPage-1)+'"'+(candPage===1?' disabled':'')+'>Previous</button>'+
        '<span class="muted" style="font-size:12.5px">page '+candPage+' of '+pages+'</span>'+
        '<button class="btn ghost sm" data-act="cand-page" data-id="'+(candPage+1)+'"'+(candPage===pages?' disabled':'')+'>Next</button>'+
        '<button class="btn ghost sm" data-act="cand-page" data-id="'+pages+'"'+(candPage===pages?' disabled':'')+'>Last</button>'+
      '</div>':'')
    :'<div class="empty"><b>No candidates match those filters</b>Reset them, or use boolean search for anything more complex.</div>');
}

/* ---------------------------------------------------------------- form engine */
function openForm(cfg){
  var vals={},errs={},soft=false,root=document.getElementById('modal-root');
  function fieldOptions(f,v){
    var raw=f.optionsFrom?f.optionsFrom(v):(f.options||[]);
    return raw.map(function(o){return (typeof o==='object')?o:{v:o,t:o};});
  }
  cfg.fields.forEach(function(f){
    if(f.value!==undefined&&f.value!==null)vals[f.k]=f.value;
    else if(f.type==='check')vals[f.k]=false;
    else if(f.type==='select'){var o=fieldOptions(f,vals);vals[f.k]=o.length?o[0].v:'';}
    else vals[f.k]='';
  });
  function draw(){
    root.innerHTML='<div class="scrim" data-scrim><div class="modal'+(cfg.wide?' wide':'')+'" role="dialog" aria-modal="true">'+
      '<div class="modal-h"><h4>'+esc(cfg.title)+'</h4>'+(cfg.note?'<p>'+esc(cfg.note)+'</p>':'')+'</div>'+
      '<div class="modal-b">'+((cfg.intro&&DB.training!==false)?'<div class="callout">'+esc(cfg.intro)+'</div>':'')+
      cfg.fields.map(function(f){
        var bad=errs[f.k]?(soft?' soft':' bad'):'',id='fld-'+f.k;
        var isReq=isRequired(cfg.entity,f.k,f.required);
        if(f.type==='check'){
          return '<div class="f cb'+bad+'"><input type="checkbox" id="'+id+'" data-f="'+f.k+'"'+(vals[f.k]?' checked':'')+'>'+
            '<div><label for="'+id+'">'+esc(f.label)+'</label>'+
            (f.hint?'<div class="hint">'+esc(f.hint)+'</div>':'')+
            (errs[f.k]?'<div class="'+(soft?'warn-note':'err')+'">'+esc(errs[f.k])+'</div>':'')+'</div></div>';
        }
        var lab='<label for="'+id+'">'+esc(f.label)+(isReq?' <span title="required">*</span>':'')+'</label>',body='';
        if(f.type==='textarea')body='<textarea id="'+id+'" data-f="'+f.k+'">'+esc(vals[f.k])+'</textarea>';
        else if(f.type==='select'){
          var opts=fieldOptions(f,vals);
          if(opts.length&&!opts.some(function(o){return String(o.v)===String(vals[f.k]);}))vals[f.k]=opts[0].v;
          body='<select id="'+id+'" data-f="'+f.k+'"'+(f.reRender?' data-re="1"':'')+'>'+
            opts.map(function(o){return '<option value="'+esc(o.v)+'"'+(String(o.v)===String(vals[f.k])?' selected':'')+'>'+esc(o.t)+'</option>';}).join('')+'</select>';
        }
        else body='<input type="'+(f.type||'text')+'" id="'+id+'" data-f="'+f.k+'" value="'+esc(vals[f.k])+'">';
        return '<div class="f'+bad+'">'+lab+body+
          (f.hint?'<div class="hint">'+esc(f.hint)+'</div>':'')+
          (errs[f.k]?'<div class="'+(soft?'warn-note':'err')+'">'+esc(errs[f.k])+'</div>':'')+'</div>';
      }).join('')+'</div>'+
      (soft?'<div class="callout warn" style="margin-top:4px"><b>These are warnings, not blocks.</b> '+
        'Permissive mode is on, which is how a live system usually behaves. Tick the box to save as it '+
        'stands — the override is recorded against your name in the activity log.'+
        '<div class="f cb" style="margin:9px 0 0"><input type="checkbox" id="ovr" data-f="__override"'+
        (vals.__override?' checked':'')+'>'+
        '<label for="ovr">Save anyway and record the override</label></div></div>':'')+
      '<div class="modal-f"><button class="btn ghost" data-close>Cancel</button>'+
      '<button class="btn'+(soft?' danger':'')+'" data-go>'+
      esc(soft?'Save with override':(cfg.submit||'Save'))+'</button></div></div></div>';

    root.querySelectorAll('[data-f]').forEach(function(el){
      var k=el.getAttribute('data-f');
      var ev=(el.tagName==='SELECT'||el.type==='checkbox'||el.type==='date'||el.type==='time')?'change':'input';
      el.addEventListener(ev,function(){
        vals[k]=el.type==='checkbox'?el.checked:el.value;
        if(el.getAttribute('data-re'))draw();
      });
    });
    root.querySelector('[data-go]').addEventListener('click',submit);
    root.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',close);});
    root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
      if(e.target===root.querySelector('[data-scrim]'))close();});
    var first=root.querySelector('.modal-b input,.modal-b textarea,.modal-b select');
    if(first)first.focus();
  }
  /* Rules that stay hard even in permissive mode: they would corrupt records
     rather than merely lower data quality. */
  var HARD=[/HARD STOP/,/already exists/i,/already on this pipeline/i,/no openings left/i,
    /Do Not Call|set to Archive/i,/already been approved at/i,/already been converted/i,
    /Use Convert/i,/after the start date/i,/ends before/i,/cannot go below/i,
    /converted to job order/i,/double count the revenue/i,/not look like a sandbox snapshot/i,
    /Could not parse/i,/misstate coverage/i,/already a time entry|already exists for this week/i];
  function isHard(msg){
    for(var i=0;i<HARD.length;i++)if(HARD[i].test(String(msg)))return true;
    return false;
  }
  function submit(){
    errs={};
    cfg.fields.forEach(function(f){
      var v=vals[f.k];
      var req=isRequired(cfg.entity,f.k,f.required);
      if(f.type==='check'){if(req&&!v)errs[f.k]='You must confirm this before continuing.';return;}
      if(req&&(v===''||v==null)){errs[f.k]='This field is required.';return;}
      if(!req&&(v===''||v==null)&&f.softRequired){
        errs[f.k]=f.softRequired;return;
      }
      if(f.min&&String(v).trim().length<f.min)errs[f.k]='Needs at least '+f.min+' characters. Currently '+String(v).trim().length+'.';
      if(f.type==='number'&&v!==''){
        if(isNaN(Number(v)))errs[f.k]='Enter a number.';
        else if(f.minNum!=null&&Number(v)<f.minNum)errs[f.k]='Must be at least '+f.minNum+'.';
      }
    });
    if(cfg.validate){var ex=cfg.validate(vals)||{};for(var k in ex)if(ex[k])errs[k]=ex[k];}
    var keys=Object.keys(errs);
    if(keys.length){
      var hard=keys.filter(function(k){return isHard(errs[k]);});
      if(DB.permissive&&!hard.length){
        if(vals.__override){
          var reasons=keys.map(function(k){return k+': '+errs[k];}).join(' | ');
          log('Override — '+(cfg.title||'form'),reasons);
          notify('Validation overridden on '+(cfg.title||'a form')+' ('+keys.length+' rule'+
            (keys.length>1?'s':'')+')');
          errs={};close();cfg.onSubmit(vals);return;
        }
        soft=true;draw();
        toast(keys.length+' warning'+(keys.length>1?'s':'')+' — tick the override to save anyway','no');
        return;
      }
      soft=false;draw();
      toast(hard.length?'That cannot be saved':'Check the highlighted fields','no');
      return;
    }
    close();cfg.onSubmit(vals);
  }
  function close(){root.innerHTML='';document.removeEventListener('keydown',onKey);}
  function onKey(e){if(e.key==='Escape')close();}
  document.addEventListener('keydown',onKey);
  draw();
}
function openInfo(title,body,html,kind){
  var root=document.getElementById('modal-root');
  root.innerHTML='<div class="scrim" data-scrim><div class="modal" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>'+esc(title)+'</h4></div>'+
    '<div class="modal-b"><div class="callout '+(kind==='ok'?'':kind||'')+'">'+esc(body)+'</div>'+(html||'')+'</div>'+
    '<div class="modal-f"><button class="btn" data-close>Close</button></div></div></div>';
  root.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('click',function(){root.innerHTML='';});});
}

/* ---------------------------------------------------------------- menu + fast find */
var MENU=[
  {g:'My desk'},
  {v:'dashboard',t:'My Dashboard'},
  {v:'tasks',t:'Tasks',ct:function(){return DB.tasks.filter(function(t){return !t.done;}).length;}},
  {v:'appts',t:'Appointments',ct:function(){return DB.appts.length;}},
  {g:'Sales'},
  {v:'leads',t:'Leads',ct:function(){return DB.leads.filter(function(l){return l.status!=='Converted';}).length;}},
  {v:'opps',t:'Opportunities',ct:function(){return DB.opps.filter(function(o){return o.status==='Open';}).length;}},
  {v:'companies',t:'Companies',ct:function(){return DB.companies.length;}},
  {v:'contacts',t:'Contacts',ct:function(){return DB.contacts.length;}},
  {g:'Recruiting'},
  {v:'jobs',t:'Job Orders',ct:function(){return openJobs().length;}},
  {v:'candidates',t:'Candidates',ct:function(){return DB.candidates.length;}},
  {v:'search',t:'Candidate Search'},
  {v:'pipeline',t:'Submissions',ct:function(){return liveSubs().length;}},
  {v:'tearsheets',t:'Tearsheets',ct:function(){return DB.tearsheets.length;}},
  {g:'Delivery'},
  {v:'placements',t:'Placements',fl:function(){return pendingPlacements().length;}},
  {v:'approvals',t:'Time & Expense',fl:function(){return pendingTime().length;}},
  {g:'Tools'},
  {v:'reports',t:'Reports'},
  {v:'data',t:'Database'},
  {v:'config',t:'Configuration'},
  {v:'notes',t:'All Notes',ct:function(){return DB.notes.length;}},
  {v:'audit',t:'Activity Log',ct:function(){return DB.audit.length;}},
  {v:'guide',t:'Guide'}
];
function fastFind(term){
  var res=document.getElementById('ff-res');
  var t=String(term||'').trim().toLowerCase();
  if(t.length<2){res.innerHTML='';return;}
  function hit(arr,label,view,sub){
    return arr.filter(function(x){return label(x).toLowerCase().indexOf(t)>=0;}).slice(0,4)
      .map(function(x){return '<a data-go="'+view+'" data-id="'+x.id+'" role="button" tabindex="0">'+
        esc(label(x))+'<small>'+esc(sub(x))+'</small></a>';});
  }
  var groups=[
    ['Candidates',hit(DB.candidates,function(c){return c.name;},'candidate',function(c){return c.occupation+' · '+c.status;})],
    ['Contacts',hit(DB.contacts,function(c){return c.name;},'contact',function(c){return c.title+' · '+coName(c.companyId);})],
    ['Companies',hit(DB.companies,function(c){return c.name;},'company',function(c){return c.category+' · '+c.status;})],
    ['Job Orders',hit(DB.jobs,function(j){return j.title;},'job',function(j){return coName(j.companyId)+' · '+j.status;})],
    ['Tearsheets',hit(DB.tearsheets,function(x){return x.name;},'tearsheet',function(x){return x.candidateIds.length+' candidates';})]
  ].filter(function(g){return g[1].length;});
  res.innerHTML=groups.length
    ? groups.map(function(g){return '<div class="grp">'+g[0]+'</div>'+g[1].join('');}).join('')
    : '<div class="none">No records match “'+esc(term)+'”.</div>';
}

/* ---------------------------------------------------------------- shared render bits */
function met(k,v,n,cls){
  return '<div class="met"><div class="k">'+esc(k)+'</div><div class="v">'+esc(v)+'</div>'+
    (n?'<div class="n '+(cls||'')+'">'+esc(n)+'</div>':'')+'</div>';
}
function subPill(st){
  var k='p-open';
  if(st==='Placed')k='p-good';
  else if(st==='Client Declined'||st==='Candidate Declined')k='p-bad';
  else if(st==='Not Proceeding')k='p-flat';
  return '<span class="pill '+k+'"><i style="background:'+pColor(st)+'"></i>'+esc(st)+'</span>';
}
function joPill(j){
  var m={'Accepting Candidates':'p-open','Covered':'p-warn','Filled':'p-good',
    'On Hold':'p-flat','Closed':'p-flat','Cancelled':'p-bad'};
  return '<span class="pill '+(m[j.status]||'p-flat')+'">'+esc(j.status)+'</span>';
}
function cdPill(c){
  var m={'New Lead':'p-flat','Active':'p-open','Submitted':'p-warn','Placed':'p-good',
    'Do Not Call':'p-bad','Archive':'p-flat'};
  return '<span class="pill '+(m[c.status]||'p-flat')+'">'+esc(c.status)+'</span>';
}
function plPill(p){
  var m={'Pending Approval':'p-warn','Approved':'p-good','Completed':'p-flat','Terminated':'p-bad'};
  return '<span class="pill '+(m[p.status]||'p-flat')+'">'+esc(p.status)+'</span>';
}
function covBar(j){
  return '<div style="display:flex;align-items:center;gap:7px"><div class="cov"><span style="width:'+
    Math.min(100,pct(j.filled,j.openings))+'%"></span></div><span class="mono">'+j.filled+'/'+j.openings+'</span></div>';
}
var REC_ICON={candidate:'\u2630',company:'\u25A6',contact:'\u263A',job:'\u25A4',
  placement:'\u2714',lead:'\u2691',opp:'\u25C6',tearsheet:'\u2263'};
function recHead(o){
  return '<div class="h rec">'+
    '<span class="ricon">'+(REC_ICON[o.type]||'\u2630')+'</span>'+
    '<h2>'+esc(o.name)+'</h2>'+
    '<span class="rsep"></span>'+
    '<span class="rmini" aria-hidden="true"><span>g</span><span>in</span><span>\u25CE</span></span>'+
    (o.next?'<button class="btn next" data-act="'+o.next.act+'" data-id="'+esc(o.next.id)+'">'+
      esc(o.next.label)+'</button>':'')+
    '<span class="sp"></span>'+
    (o.actions?'<div class="btnrow">'+o.actions+'</div>':'')+
    '<div class="ricons">'+
      '<button data-act="prevrec" data-id="'+esc(o.id)+'" data-type="'+o.type+'" title="Previous record" aria-label="Previous record">\u2039</button>'+
      '<button data-act="nextrec" data-id="'+esc(o.id)+'" data-type="'+o.type+'" title="Next record" aria-label="Next record">\u203A</button>'+
      '<button data-act="refresh" title="Refresh" aria-label="Refresh">\u21BB</button>'+
      '<button data-act="tabclose-cur" data-id="'+esc(o.id)+'" title="Close this record" aria-label="Close this record">\u00d7</button>'+
    '</div></div>'+
    (o.sub?'<p class="recsub">'+o.sub+'</p>':'');
}
var CHEV=['Prescreen','Submission','Client Submission','Interview','Offer Extended','Placement'];
function chevBar(reached,current,out){
  return '<div class="chev">'+CHEV.map(function(label,i){
    var cls='';
    if(out&&i>reached)cls='';
    else if(i===current)cls=out?'out':'now';
    else if(i<=reached)cls='done';
    var reachedIx=i<=reached?i:-1;
    return '<div class="chevs '+cls+'"'+
      (reachedIx>=0?' data-act="stage-open" data-id="'+esc(PIPE_K[i]||'')+'" role="button" '+
        'tabindex="0" title="Open the submission at '+esc(PIPE_K[i]||'')+'"':'')+
      '><span>'+esc(out&&i===current?out:label)+'</span></div>';
  }).join('')+'</div>';
}
function panelIcons(){
  return '<span class="sp"></span><span class="pi">'+
    '<button data-act="refresh" title="Refresh" aria-label="Refresh">\u21BB</button>'+
    '<button data-act="noop" title="Collapse" aria-label="Collapse">\u2297</button></span>';
}
/* The record content sits alongside a Details card on the right, which is the documented
   pattern and reads very differently from a full-width form. */
function withDetails(mainHtml,rows,title){
  return '<div class="recbody"><div class="reccols">'+mainHtml+'</div>'+
    '<aside class="detailscard"><div class="dc-h">'+esc(title||'Details')+'</div>'+
    '<div class="dc-b">'+rows.map(function(r){
      return '<div class="dc-row"><div class="k">'+esc(r[0])+'</div>'+
        '<div class="v">'+(r[2]?r[1]:esc(r[1]==null||r[1]===''?'\u2014':r[1]))+'</div></div>';
    }).join('')+'</div></aside></div>';
}
function detailRows(rows){
  return '<table class="detail"><tbody>'+rows.map(function(r){
    return '<tr><th>'+esc(r[0])+'</th><td>'+(r[2]?r[1]:esc(r[1]))+'</td></tr>';
  }).join('')+'</tbody></table>';
}
function listBar(title,extra){
  return '<div class="listbar"><span class="dot"></span><h2>'+esc(title)+'</h2>'+
    '<div class="vtog"><button class="on" title="List view" aria-label="List view">\u2263</button>'+
    '<button data-go="reports" title="Chart view" aria-label="Chart view">\u25E7</button></div>'+
    (extra||'')+
    '<span class="sp"></span><div class="li">'+
    '<button data-act="refresh" title="Refresh" aria-label="Refresh">\u21BB</button>'+
    '<button data-act="noop" title="Print" aria-label="Print">\u2399</button></div></div>';
}
function crumb(parts){
  return '<div class="crumb">'+parts.map(function(p,i){
    var sep=i?' / ':'';
    if(!p.v)return sep+'<b>'+esc(p.t)+'</b>';
    return sep+'<span class="lnk" data-go="'+p.v+'"'+(p.id?' data-id="'+p.id+'"':'')+'>'+esc(p.t)+'</span>';
  }).join('')+'</div>';
}
function rtabs(items,active,view,id,entity){
  if(entity)items=visibleTabs(entity,items);
  return '<div class="rtabs">'+items.map(function(it){
    if(it.act)
      return '<a data-act="'+it.act+'" data-id="'+id+'" role="button" tabindex="0">'+esc(it.t)+'</a>';
    return '<a data-rtab="'+it.k+'" data-go="'+view+'" data-id="'+id+'" class="'+(active===it.k?'on':'')+'" role="button" tabindex="0">'+
      esc(it.t)+(it.ct!=null?'<span class="ct">'+it.ct+'</span>':'')+'</a>';
  }).join('')+
  (entity?'<a class="layout" data-go="config" role="button" tabindex="0" '+
    'title="Show, hide and reorder these tabs">Layout \u2699</a>':'')+
  '</div>';
}
/* Activity is wider than Notes: status changes, sendouts, appointments and placements
   all belong on it, which is what makes the tab worth having separately. */
function activityFor(candId){
  var out=[];
  notesFor('candidateId',candId).forEach(function(n){
    out.push({at:n.at,by:n.by,kind:n.action==='Email'?'Email':'Note',
      t:n.action+': '+n.text.split('\n')[0].slice(0,140)});
  });
  candSubs(candId).forEach(function(sb){
    (sb.history||[]).forEach(function(h){
      out.push({at:h.at,by:h.by,kind:'Status',
        t:'Submission on '+jobName(sb.jobId)+' \u2192 '+h.status});
    });
    if(sb.sendoutAt)out.push({at:sb.sendoutAt,by:sb.owner,kind:'Sendout',
      t:'Sent to '+ctName(sb.sentTo)+' for '+jobName(sb.jobId)});
  });
  DB.appts.filter(function(a){return a.candidateId===candId;}).forEach(function(a){
    out.push({at:a.at,by:'A. Trainee',kind:'Appointment',
      t:a.subject+' \u00b7 '+a.location+' \u00b7 '+a.attendees});
  });
  DB.placements.filter(function(p){return p.candidateId===candId;}).forEach(function(p){
    out.push({at:new Date(p.start).toISOString(),by:p.createdBy||'A. Rao',kind:'Placement',
      t:'Placement on '+jobName(p.jobId)+' \u00b7 '+p.status});
  });
  return out.sort(function(a,b){return new Date(b.at)-new Date(a.at);});
}
var ACT_ICON={Note:'\u270E',Email:'\u2709',Status:'\u21BB',Sendout:'\u21AA',
  Appointment:'\u25F7',Placement:'\u2714',Task:'\u2713'};
function activityList(rows,empty){
  if(!rows.length)return '<div class="muted" style="font-size:13px">'+esc(empty)+'</div>';
  return '<div class="tl">'+rows.slice(0,60).map(function(r){
    return '<div class="tl-i"><div class="m">'+esc(ACT_ICON[r.kind]||'\u2022')+' '+esc(r.kind)+
      ' \u00b7 '+esc(r.by||'')+' \u00b7 '+esc(fmtDT(r.at))+'</div>'+
      '<div class="t">'+esc(r.t)+'</div></div>';
  }).join('')+'</div>';
}
function filesPanel(c){
  var fs=fileList(c);
  return '<div class="card"><div class="card-h"><h4>Files</h4>'+panelIcons()+'</div>'+
    (fs.length?'<table><thead><tr><th>Name</th><th>Type</th><th>Added</th><th>By</th><th></th></tr></thead><tbody>'+
      fs.map(function(f){
        return '<tr><td style="font-weight:600">'+esc(f.name)+
          (f.isResume?' <span class="pill p-open">resume</span>':'')+'</td>'+
          '<td class="muted">'+esc(f.type)+'</td><td class="muted">'+fmtD(f.at)+'</td>'+
          '<td class="muted">'+esc(f.by)+'</td>'+
          '<td style="text-align:right">'+
            (f.isResume?'<button class="btn sm" data-act="parse-existing" data-cand="'+c.id+
              '" data-id="'+f.id+'">Parse as Existing</button> ':'')+
            '<button class="btn ghost sm" data-act="file-actions" data-cand="'+c.id+
              '" data-id="'+f.id+'">Actions \u25BE</button></td></tr>';
      }).join('')+'</tbody></table>'
    :'<div class="empty" style="padding:20px"><b>No files on this record</b>'+
      'A resume attached here does not change the record until you parse it.'+
      '<div style="margin-top:10px"><button class="btn" data-act="upload-cv" data-id="'+c.id+
      '">Attach a resume</button></div></div>')+
    '<div class="card-b" style="border-top:1px solid var(--line2)">'+
      '<div class="f cb" style="margin:0"><input type="checkbox" id="pov" role="switch" '+
      'aria-label="Overwrite prevention" data-act="parser-toggle"'+
      (DB.parserOverwritePrevention?' checked':'')+'>'+
      '<div><label for="pov">Overwrite prevention</label>'+
      '<div class="hint">On: fields that already hold a value are protected from a parse, and skills '+
      'and certifications append instead of replacing. Off is the documented default.</div></div></div>'+
    '</div></div>';
}
function noteList(notes,empty){
  if(!notes.length)return '<div class="muted" style="font-size:13px">'+esc(empty)+'</div>';
  return '<div class="tl">'+notes.slice(0,12).map(function(n){
    var links=[];
    if(n.links.candidateId)links.push(candName(n.links.candidateId));
    if(n.links.contactId)links.push(ctName(n.links.contactId));
    if(n.links.jobId)links.push(jobName(n.links.jobId));
    return '<div class="tl-i"><div class="m">'+esc(n.action)+' · '+esc(n.by)+' · '+esc(ago(n.at))+
      (links.length?' · '+esc(links.join(', ')):'')+'</div><div class="t">'+esc(n.text)+'</div></div>';
  }).join('')+'</div>';
}
function taskTable(rows){
  if(!rows.length)return '<div class="empty"><b>Nothing outstanding</b>Tasks you commit to with a date appear here.</div>';
  return '<div class="tw"><table><tbody>'+rows.map(function(t){
    var late=!t.done&&new Date(t.due)<new Date(iso(TODAY));
    return '<tr><td style="width:26px"><span style="width:16px;height:16px;border:1.5px solid var(--line);'+
      'border-radius:3px;display:block;cursor:pointer" data-act="task" data-id="'+t.id+
      '" role="checkbox" tabindex="0" aria-checked="false" '+
      'aria-label="Mark complete: '+esc(t.subject)+'" title="Mark complete"></span></td>'+
      '<td>'+esc(t.subject)+(t.entity?' <span class="mono muted">'+esc(t.entity)+'</span>':'')+'</td>'+
      '<td style="width:80px">'+(t.priority==='High'?'<span class="pill p-warn">High</span>':'<span class="muted">'+esc(t.priority)+'</span>')+'</td>'+
      '<td style="width:118px">'+(late?'<span class="pill p-bad">due '+fmtD(t.due)+'</span>':'<span class="muted">'+fmtD(t.due)+'</span>')+'</td>'+
      '<td style="width:48px;text-align:right"><span class="lnk" data-act="edit-task" data-id="'+t.id+'">edit</span></td></tr>';
  }).join('')+'</tbody></table></div>';
}

/* ---------------------------------------------------------------- views */
function vDashboard(){
  var f=funnel(DB.subs);
  var tf=timeToFill();
  var mine=scenarioState(activeScenario);
  var flags=[
    {n:staleSubs().length,t:'submissions with no status change for 5+ days',v:'pipeline'},
    {n:pendingTime().length,t:'time entries awaiting approval',v:'approvals'},
    {n:pendingPlacements().length,t:'placements pending approval',v:'placements'},
    {n:onboardGaps().length,t:'placements with an incomplete onboarding pack',v:'placements'},
    {n:openJobs().filter(function(j){return jobSubs(j.id).length===0;}).length,
      t:'live job orders with an empty pipeline',v:'jobs'}
  ].filter(function(x){return x.n>0;});
  var recent=DB.notes.slice().sort(function(a,b){return new Date(b.at)-new Date(a.at);});

  return '<div class="mpad">'+
    '<div class="h"><h2>My Dashboard</h2><span class="sp"></span>'+
      '<div class="btnrow"><button class="btn ghost" data-act="note">Add Note</button>'+
      '<button class="btn" data-act="addnew">+ Add New</button></div></div>'+
    '<p class="sub">'+fmtD(TODAY)+' \u00b7 A. Trainee \u00b7 Aurora and Halcyon desks</p>'+

    '<div class="grid g4">'+
      met('Live job orders',openJobs().length,
        openJobs().reduce(function(a,j){return a+(j.openings-j.filled);},0)+' openings unfilled')+
      met('Live submissions',liveSubs().length,staleSubs().length+' ageing past 5 days',
        staleSubs().length?'dn':'')+
      met('Sendouts',sendouts().length,f['Interview Scheduled']+' reached interview')+
      met('Average time to fill',tf==null?'\u2014':tf+' days','job order added to placed')+
    '</div>'+

    (flags.length?'<div class="sec"><h3>Needs attention</h3><div class="tw"><table><tbody>'+
      flags.map(function(x){
        return '<tr class="click" data-go="'+x.v+'"><td style="width:52px">'+
          '<span class="pill p-warn">'+x.n+'</span></td>'+
          '<td>'+esc(x.t)+'</td><td style="text-align:right"><span class="lnk">Open</span></td></tr>';
      }).join('')+'</tbody></table></div></div>':'')+

    '<div class="sec grid g2">'+
      '<div class="card"><div class="card-h"><h4>Submission funnel</h4><span class="sp"></span>'+
        '<span class="muted mono">'+DB.subs.length+' submissions</span></div><div class="card-b">'+
        '<div class="fun">'+PIPE.map(function(st,ix){
          var n=f[st.k],top=f[PIPE_K[0]]||1,prev=ix?f[PIPE_K[ix-1]]:null;
          return '<div class="fun-row"><span>'+esc(st.k)+'</span>'+
            '<div class="fun-bar"><span style="width:'+Math.max(2,pct(n,top))+'%;background:'+st.c+'"></span></div>'+
            '<span class="r">'+n+(prev?' \u00b7 '+pct(n,prev)+'%':'')+'</span></div>';
        }).join('')+'</div>'+
        '<p class="muted" style="font-size:12px;margin:11px 0 0">Percentages are stage-to-stage '+
        'conversion. The drop between two adjacent statuses is where the coaching conversation belongs.</p>'+
        '</div></div>'+
      '<div class="card"><div class="card-h"><h4>Practice progress</h4></div><div class="card-b">'+
        (DB.training===false
          ?'<div class="muted" style="font-size:13px">Training mode is off, so scenarios are hidden.</div>'
          :'<div class="kv"><dt>Scenario</dt><dd>'+esc(mine.sc.name)+'</dd>'+
            '<dt>Steps complete</dt><dd>'+mine.done+' of '+mine.total+'</dd>'+
            '<dt>Desk review</dt><dd>'+(DB.quiz?DB.quiz.score+'/3':'not attempted')+'</dd>'+
            '<dt>Knowledge check</dt><dd>'+
              (DB.assess?DB.assess.score+'/'+DB.assess.total:'not attempted')+'</dd>'+
            '<dt>Actions recorded</dt><dd>'+DB.audit.length+'</dd></div>')+
        '<div class="btnrow" style="margin-top:13px">'+
        '<button class="btn ghost sm" data-act="assess">Knowledge check</button>'+
        '<button class="btn ghost sm" data-act="session">Session summary</button></div></div></div>'+
    '</div>'+

    '<div class="sec grid g2">'+
      '<div><h3 style="font-size:13.5px;font-weight:600;margin:0 0 9px">Today and overdue '+
        '<em style="font-style:normal;color:var(--ink3);font-weight:400">\u00b7 '+
        DB.tasks.filter(function(t){return !t.done;}).length+' open</em></h3>'+
        taskTable(DB.tasks.filter(function(t){return !t.done;}).slice(0,6))+'</div>'+
      '<div class="card"><div class="card-h"><h4>Latest notes</h4></div><div class="card-b">'+
        noteList(recent,'Nothing logged yet.')+'</div></div>'+
    '</div></div>';
}
function vTasks(){
  var open=DB.tasks.filter(function(t){return !t.done;});
  var done=DB.tasks.filter(function(t){return t.done;});
  return '<div class="h"><h2>Tasks</h2><span class="sp"></span><button class="btn" data-act="add-task">Add Task</button></div>'+
    '<p class="sub">Commitments with a date and an owner.</p>'+
    '<div class="sec"><h3>Open</h3>'+taskTable(open)+'</div>'+
    (done.length?'<div class="sec"><h3>Completed <em>· '+done.length+'</em></h3><div class="tw"><table><tbody>'+
      done.map(function(t){return '<tr><td class="muted" style="text-decoration:line-through">'+esc(t.subject)+'</td>'+
        '<td style="width:90px"><span class="pill p-good">done</span></td>'+
        '<td style="width:70px;text-align:right"><span class="lnk" data-act="task" data-id="'+t.id+'">reopen</span></td></tr>';
      }).join('')+'</tbody></table></div></div>':'');
}

function vAppts(){
  var rows=DB.appts.slice().sort(function(a,b){return new Date(a.at)-new Date(b.at);});
  return '<div class="h"><h2>Appointments</h2></div>'+
    '<p class="sub">Interviews and meetings created from a submission. An interview that exists only in your inbox is how candidates get missed.</p>'+
    (rows.length?'<div class="tw"><table><thead><tr><th>Subject</th><th>Type</th><th>When</th><th>Format</th>'+
      '<th>Attendees</th><th>Job order</th></tr></thead><tbody>'+rows.map(function(a){
      return '<tr class="click" data-go="job" data-id="'+a.jobId+'"><td style="font-weight:500">'+esc(a.subject)+'</td>'+
        '<td class="muted">'+esc(a.type)+'</td><td>'+esc(fmtDT(a.at))+'</td>'+
        '<td class="muted">'+esc(a.location)+'</td><td class="muted">'+esc(a.attendees)+'</td>'+
        '<td><span class="lnk">'+esc(jobName(a.jobId))+'</span></td></tr>';
    }).join('')+'</tbody></table></div>'
    :'<div class="empty"><b>No appointments</b>Move a submission to Interview Scheduled to create one.</div>');
}

function vLeads(){
  return '<div class="h"><h2>Leads</h2><span class="sp"></span><button class="btn" data-act="add-lead">Add Lead</button></div>'+
    '<p class="sub">Unqualified sales enquiries. A lead holds no job order and no submissions until it is converted.</p>'+
    '<div class="tw"><table><thead><tr><th>Name</th><th>Company</th><th>Title</th><th>Status</th>'+
    '<th>Source</th><th>Owner</th><th>Added</th></tr></thead><tbody>'+
    DB.leads.map(function(l){
      var m={'New Lead':'p-open','In Process':'p-warn','Converted':'p-good','Archive':'p-flat'};
      return '<tr class="click" data-go="lead" data-id="'+l.id+'"><td><span class="lnk">'+esc(l.name)+'</span>'+
        (l.mine?' <span class="tag">yours</span>':'')+'</td>'+
        '<td>'+esc(l.company)+'</td><td class="muted">'+esc(l.title)+'</td>'+
        '<td><span class="pill '+(m[l.status]||'p-flat')+'">'+esc(l.status)+'</span></td>'+
        '<td class="muted">'+esc(l.source)+'</td><td class="muted">'+esc(l.owner)+'</td>'+
        '<td class="muted">'+fmtD(l.added)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function vLead(){
  var l=byId(DB.leads,route.id);
  if(!l)return notFound();
  return crumb([{v:'leads',t:'Leads'},{t:l.name}])+
    recHead({type:'lead',id:l.id,name:l.name,
      next:l.status!=='Converted'?{act:'convert-lead',id:l.id,label:'Convert Lead'}:null,
      actions:'<button class="btn ghost" data-act="edit-lead" data-id="'+l.id+'">Edit</button>'+
        '<button class="btn ghost" data-act="note">Add Note</button>',
      sub:esc(l.title)+' at '+esc(l.company)+' \u00b7 '+esc(l.status)+
        ' \u00b7 '+esc(l.source)+' \u00b7 record <span class="mono">'+esc(l.id)+'</span>'})+
    '<p class="sub">'+esc(l.title)+' at '+esc(l.company)+' · '+esc(l.source)+' · record <span class="mono">'+esc(l.id)+'</span></p>'+
    '<div class="snap">'+
      '<div><div class="k">Status</div><div class="v">'+esc(l.status)+'</div></div>'+
      '<div><div class="k">Owner</div><div class="v">'+esc(l.owner)+'</div></div>'+
      '<div><div class="k">Date added</div><div class="v">'+fmtD(l.added)+'</div></div>'+
      '<div><div class="k">Converted to</div><div class="v">'+(l.companyId?esc(coName(l.companyId)):'—')+'</div></div>'+
    '</div>'+
    '<div class="sec"><h3>Qualification notes</h3><div class="card"><div class="card-b">'+
      '<p style="margin:0;font-size:13px;max-width:64ch">'+esc(l.notes)+'</p></div></div></div>'+
    (l.status==='Converted'?'<div class="sec"><div class="callout">Converted on this desk. The company and contact records carry the work from here; this record is kept so the origin and source are not lost.</div></div>':'');
}

function vOpps(){
  return '<div class="h"><h2>Opportunities</h2><span class="sp"></span><button class="btn" data-act="add-opp">Add Opportunity</button></div>'+
    '<p class="sub">Forecastable requirements not yet released as job orders. Value times probability is what a sales forecast is built on.</p>'+
    (DB.opps.length?'<div class="tw"><table><thead><tr><th>Opportunity</th><th>Company</th><th>Contact</th>'+
      '<th>Type</th><th>Status</th><th class="num">Value</th><th class="num">Prob.</th><th>Close</th></tr></thead><tbody>'+
      DB.opps.map(function(o){
        var m={Open:'p-open',Won:'p-good',Lost:'p-bad'};
        return '<tr class="click" data-go="opp" data-id="'+o.id+'"><td><span class="lnk">'+esc(o.title)+'</span>'+
          (o.mine?' <span class="tag">yours</span>':'')+'</td>'+
          '<td class="muted">'+esc(coName(o.companyId))+'</td><td class="muted">'+esc(ctName(o.contactId))+'</td>'+
          '<td class="muted">'+esc(o.type)+'</td>'+
          '<td><span class="pill '+(m[o.status]||'p-flat')+'">'+esc(o.status)+'</span></td>'+
          '<td class="num">'+money(o.value)+'</td><td class="num">'+o.probability+'%</td>'+
          '<td class="muted">'+fmtD(o.closeDate)+'</td></tr>';
      }).join('')+'</tbody></table></div>'
    :'<div class="empty"><b>No opportunities</b>Convert a lead or add one against a company.</div>');
}
function vOpp(){
  var o=byId(DB.opps,route.id);
  if(!o)return notFound();
  return crumb([{v:'opps',t:'Opportunities'},{v:'company',id:o.companyId,t:coName(o.companyId)},{t:o.title}])+
    recHead({type:'opp',id:o.id,name:o.title,
      next:o.status==='Open'?{act:'convert-opp',id:o.id,label:'Convert to Job Order'}:null,
      actions:'<button class="btn ghost" data-act="edit-opp" data-id="'+o.id+'">Edit</button>'+
        '<button class="btn ghost" data-act="note">Add Note</button>',
      sub:esc(coName(o.companyId))+' \u00b7 '+esc(ctName(o.contactId))+' \u00b7 '+esc(o.status)+
        ' \u00b7 '+money(o.value)+' at '+o.probability+'% \u00b7 record <span class="mono">'+
        esc(o.id)+'</span>'})+
    '<p class="sub">'+esc(coName(o.companyId))+' · '+esc(ctName(o.contactId))+' · record <span class="mono">'+esc(o.id)+'</span></p>'+
    '<div class="snap">'+
      '<div><div class="k">Status</div><div class="v">'+esc(o.status)+'</div></div>'+
      '<div><div class="k">Type</div><div class="v">'+esc(o.type)+'</div></div>'+
      '<div><div class="k">Estimated value</div><div class="v">'+money(o.value)+'</div></div>'+
      '<div><div class="k">Probability</div><div class="v">'+o.probability+'%</div></div>'+
      '<div><div class="k">Weighted value</div><div class="v">'+money(Math.round(o.value*o.probability/100))+'</div></div>'+
      '<div><div class="k">Expected close</div><div class="v">'+fmtD(o.closeDate)+'</div></div>'+
    '</div>'+
    (o.jobId?'<div class="sec"><div class="callout">Won and converted to job order <span class="lnk" data-go="job" data-id="'+o.jobId+'">'+esc(jobName(o.jobId))+'</span>. The forecast and the live requirement no longer double count.</div></div>'
      :'<div class="sec"><div class="callout warn">Still open. Converting creates the job order and closes this as Won, which is what stops the same revenue being counted twice.</div></div>');
}

function vCompanies(){
  return '<div class="h"><h2>Companies</h2><span class="sp"></span><div class="btnrow">'+
    '<button class="btn ghost" data-act="add-contact">Add Contact</button>'+
    '<button class="btn" data-act="add-company">Add Company</button></div></div>'+
    '<p class="sub">The parent record. Every job order, submission and placement traces back to one of these.</p>'+
    '<div class="tw"><table><thead><tr><th>Company</th><th>Category</th><th>Status</th><th>Owner</th>'+
    '<th class="num">Contacts</th><th class="num">Live job orders</th><th>Last note</th></tr></thead><tbody>'+
    DB.companies.map(function(c){
      var n=notesFor('companyId',c.id)[0];
      var m={'Active Client':'p-good','Prospect':'p-open','Archive':'p-flat'};
      return '<tr class="click" data-go="company" data-id="'+c.id+'">'+
        '<td><span class="qv" data-act="peek" data-type="company" data-id="'+c.id+
          '" role="button" tabindex="0" title="Quick view">\u25CE</span> '+
          '<span class="lnk">'+esc(c.name)+'</span>'+(c.mine?' <span class="tag">yours</span>':'')+'</td>'+
        '<td class="muted">'+esc(c.category)+'</td>'+
        '<td><span class="pill '+(m[c.status]||'p-flat')+'">'+esc(c.status)+'</span></td>'+
        '<td class="muted">'+esc(c.owner)+'</td>'+
        '<td class="num">'+coContacts(c.id).length+'</td>'+
        '<td class="num">'+coJobs(c.id).filter(function(j){return openJobs().indexOf(j)>=0;}).length+'</td>'+
        '<td class="muted">'+(n?esc(ago(n.at)):'never')+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function jobRow(j){
  return '<tr class="click" data-go="job" data-id="'+j.id+'">'+
    '<td><span class="qv" data-act="peek" data-type="job" data-id="'+j.id+
      '" role="button" tabindex="0" title="Quick view">\u25CE</span> '+
      '<span class="lnk">'+esc(j.title)+'</span>'+(j.published?' <span class="tag">published</span>':'')+
      '<div class="muted" style="font-size:12px">'+esc(coName(j.companyId))+' · '+esc(j.location)+'</div></td>'+
    '<td class="muted">'+esc(j.type)+'</td>'+
    '<td>'+joPill(j)+'</td><td>'+covBar(j)+'</td>'+
    '<td class="num">'+jobSubs(j.id).filter(function(s){return PIPE_OUT.indexOf(s.status)<0;}).length+'</td>'+
    '<td class="num">'+money(j.billRate)+'</td>'+
    '<td class="muted">'+fmtD(j.added)+'</td></tr>';
}
function vCompany(){
  var c=byId(DB.companies,route.id);
  if(!c)return notFound();
  var jobs=coJobs(c.id),cts=coContacts(c.id),notes=notesFor('companyId',c.id);
  var opps=DB.opps.filter(function(o){return o.companyId===c.id;});
  var tab=route.tab||'overview';
  var head=crumb([{v:'companies',t:'Companies'},{t:c.name}])+
    recHead({type:'company',id:c.id,name:c.name,
      next:{act:'add-job',id:c.id,label:'Add Job Order'},
      actions:'<button class="btn ghost" data-act="edit-company" data-id="'+c.id+'">Edit</button>'+
        '<button class="btn ghost" data-act="note" data-companyid="'+c.id+'">Add Note</button>'+
        '<button class="btn ghost" data-act="actions" data-type="company" data-id="'+c.id+'">Actions \u25BE</button>',
      sub:esc(c.category)+' &middot; '+esc(c.status)+' &middot; owner '+esc(c.owner)+
        ' &middot; record <span class="mono">'+esc(c.id)+'</span>'})+
    '<div class="snap">'+
      '<div><div class="k">Status</div><div class="v">'+esc(c.status)+'</div></div>'+
      '<div><div class="k">Client since</div><div class="v">'+fmtD(c.since)+'</div></div>'+
      '<div><div class="k">Employees</div><div class="v">'+esc(c.employees)+'</div></div>'+
      '<div><div class="k">Live job orders</div><div class="v">'+jobs.filter(function(j){return openJobs().indexOf(j)>=0;}).length+'</div></div>'+
      '<div><div class="k">Placements</div><div class="v">'+DB.placements.filter(function(p){
        var j=byId(DB.jobs,p.jobId);return j&&j.companyId===c.id;}).length+'</div></div>'+
    '</div>'+
    rtabs([{k:'overview',t:'Overview'},{k:'contacts',t:'Contacts',ct:cts.length},
      {k:'jobs',t:'Job Orders',ct:jobs.length},{k:'opps',t:'Opportunities',ct:opps.length},
      {k:'notes',t:'Notes',ct:notes.length}],tab,'company',c.id);

  var body='';
  if(tab==='overview'){
    body='<div class="grid g2"><div class="card"><div class="card-h"><h4>Primary contact</h4></div><div class="card-b">'+
      (cts.filter(function(t){return t.primary;})[0]
        ?(function(t){return '<div class="kv"><dt>Name</dt><dd><span class="lnk" data-go="contact" data-id="'+t.id+'">'+esc(t.name)+'</span></dd>'+
          '<dt>Title</dt><dd style="font-weight:400">'+esc(t.title)+'</dd>'+
          '<dt>Phone</dt><dd class="mono">'+esc(t.phone)+'</dd>'+
          '<dt>Email</dt><dd style="font-weight:400">'+esc(t.email)+'</dd></div>';})(cts.filter(function(t){return t.primary;})[0])
        :'<div class="muted" style="font-size:13px">No primary contact flagged. Sendouts and feedback have no clear owner on the client side.</div>')+
      '</div></div>'+
      '<div class="card"><div class="card-h"><h4>Recent notes</h4></div><div class="card-b">'+
      noteList(notes,'Nothing logged. An account with no note history is an account nobody owns.')+'</div></div></div>';
  } else if(tab==='contacts'){
    body=cts.length?'<div class="tw"><table><thead><tr><th>Name</th><th>Title</th><th>Status</th><th>Phone</th><th>Email</th><th></th></tr></thead><tbody>'+
      cts.map(function(t){
        return '<tr class="click" data-go="contact" data-id="'+t.id+'"><td><span class="lnk">'+esc(t.name)+'</span>'+
          (t.primary?' <span class="tag">primary</span>':'')+'</td>'+
          '<td class="muted">'+esc(t.title)+'</td><td class="muted">'+esc(t.status)+'</td>'+
          '<td class="mono">'+esc(t.phone)+'</td><td class="muted" style="font-size:12px">'+esc(t.email)+'</td>'+
          '<td style="text-align:right"><span class="lnk">Open</span></td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>No contacts</b>A job order cannot be raised without one.</div>';
  } else if(tab==='jobs'){
    body=jobs.length?'<div class="tw"><table><thead><tr><th>Job order</th><th>Type</th><th>Status</th><th>Coverage</th>'+
      '<th class="num">Pipeline</th><th class="num">Bill rate</th><th>Added</th></tr></thead><tbody>'+
      jobs.map(jobRow).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>No job orders</b>Add one to start a pipeline.</div>';
  } else if(tab==='opps'){
    body=opps.length?'<div class="tw"><table><thead><tr><th>Opportunity</th><th>Status</th><th class="num">Value</th><th>Close</th></tr></thead><tbody>'+
      opps.map(function(o){
        return '<tr class="click" data-go="opp" data-id="'+o.id+'"><td><span class="lnk">'+esc(o.title)+'</span></td>'+
          '<td class="muted">'+esc(o.status)+'</td><td class="num">'+money(o.value)+'</td>'+
          '<td class="muted">'+fmtD(o.closeDate)+'</td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>No opportunities</b>Forecast a requirement before it becomes a job order.</div>';
  } else {
    body='<div class="card"><div class="card-b">'+noteList(notes,'Nothing logged against this company.')+'</div></div>';
  }
  return head+'<div class="tabbody">'+body+'</div>';
}

function vContacts(){
  return '<div class="h"><h2>Contacts</h2><span class="sp"></span><button class="btn" data-act="add-contact">Add Contact</button></div>'+
    '<p class="sub">The named people who receive sendouts and give feedback.</p>'+
    '<div class="tw"><table><thead><tr><th>Name</th><th>Title</th><th>Company</th><th>Phone</th>'+
    '<th class="num">Job orders</th><th>Last note</th><th></th></tr></thead><tbody>'+
    DB.contacts.map(function(t){
      var n=notesFor('contactId',t.id)[0];
      return '<tr class="click" data-go="contact" data-id="'+t.id+'"><td><span class="lnk">'+esc(t.name)+'</span>'+
        (t.primary?' <span class="tag">primary</span>':'')+(t.mine?' <span class="tag">yours</span>':'')+'</td>'+
        '<td class="muted">'+esc(t.title)+'</td><td class="muted">'+esc(coName(t.companyId))+'</td>'+
        '<td class="mono">'+esc(t.phone)+'</td>'+
        '<td class="num">'+DB.jobs.filter(function(j){return j.contactId===t.id;}).length+'</td>'+
        '<td class="muted">'+(n?esc(ago(n.at)):'never')+'</td>'+
        '<td style="text-align:right"><span class="lnk">Open</span></td></tr>';
    }).join('')+'</tbody></table></div>';
}
function vContact(){
  var t=byId(DB.contacts,route.id);
  if(!t)return notFound();
  var notes=notesFor('contactId',t.id);
  var jobs=DB.jobs.filter(function(j){return j.contactId===t.id;});
  var sent=DB.subs.filter(function(s){return s.sentTo===t.id;});
  return crumb([{v:'contacts',t:'Contacts'},{v:'company',id:t.companyId,t:coName(t.companyId)},{t:t.name}])+
    recHead({type:'contact',id:t.id,name:t.name,
      next:{act:'add-job',id:t.companyId,label:'Add Job Order'},
      actions:'<button class="btn ghost" data-act="edit-contact" data-id="'+t.id+'">Edit</button>'+
        '<button class="btn ghost" data-act="email" data-to="contact" data-ctid="'+t.id+'">Email</button>'+
        '<button class="btn ghost" data-act="note" data-contactid="'+t.id+'">Add Note</button>',
      sub:esc(t.title)+' at '+esc(coName(t.companyId))+' \u00b7 '+esc(t.status)+
        ' \u00b7 owner '+esc(t.owner)+' \u00b7 record <span class="mono">'+esc(t.id)+'</span>'})+
    '<p class="sub">'+esc(t.title)+' at '+esc(coName(t.companyId))+' · record <span class="mono">'+esc(t.id)+'</span></p>'+
    '<div class="snap">'+
      '<div><div class="k">Status</div><div class="v">'+esc(t.status)+'</div></div>'+
      '<div><div class="k">Phone</div><div class="v mono">'+esc(t.phone)+'</div></div>'+
      '<div><div class="k">Email</div><div class="v" style="font-weight:400">'+esc(t.email)+'</div></div>'+
      '<div><div class="k">Owner</div><div class="v">'+esc(t.owner)+'</div></div>'+
      '<div><div class="k">Sendouts received</div><div class="v">'+sent.length+'</div></div>'+
    '</div>'+
    '<div class="sec grid g2">'+
      '<div class="card"><div class="card-h"><h4>Job orders</h4></div>'+
        (jobs.length?'<table><tbody>'+jobs.map(function(j){
          return '<tr class="click" data-go="job" data-id="'+j.id+'"><td><span class="lnk">'+esc(j.title)+'</span></td>'+
            '<td>'+joPill(j)+'</td><td>'+covBar(j)+'</td></tr>';
        }).join('')+'</tbody></table>':'<div class="empty">No job orders with this contact.</div>')+'</div>'+
      '<div class="card"><div class="card-h"><h4>Notes</h4></div><div class="card-b">'+
        noteList(notes,'Nothing logged against this contact.')+'</div></div>'+
    '</div>';
}

function vJobs(){
  var live=DB.jobs.filter(function(j){return ['Accepting Candidates','Covered'].indexOf(j.status)>=0;});
  var rest=DB.jobs.filter(function(j){return ['Accepting Candidates','Covered'].indexOf(j.status)<0;});
  var _unused=0;
  var head='<thead><tr>'+sortTh('job','title','Job order')+sortTh('job','type','Type')+
    sortTh('job','status','Status')+sortTh('job','cover','Coverage')+
    sortTh('job','pipe','Pipeline','num')+sortTh('job','billRate','Bill rate','num')+
    sortTh('job','added','Added')+'</tr></thead>';
  live=sortRows(live,'job');rest=sortRows(rest,'job');
  return '<div class="h"><h2>Job Orders</h2><span class="sp"></span><button class="btn" data-act="add-job">Add Job Order</button></div>'+
    '<p class="sub">The unit of work. Coverage counts placements against openings, not sendouts sent.</p>'+
    '<div class="sec"><h3>Live <em>· '+live.length+'</em></h3>'+
      (live.length?'<div class="tw"><table>'+head+'<tbody>'+live.map(jobRow).join('')+'</tbody></table></div>'
       :'<div class="empty"><b>No live job orders</b>Add one from a company record.</div>')+'</div>'+
    (rest.length?'<div class="sec"><h3>Filled, on hold and closed <em>· '+rest.length+'</em></h3>'+
      '<div class="tw"><table>'+head+'<tbody>'+rest.map(jobRow).join('')+'</tbody></table></div></div>':'');
}

function vJob(){
  var j=byId(DB.jobs,route.id);
  if(!j)return notFound();
  var subs=jobSubs(j.id),f=funnel(subs),notes=notesFor('jobId',j.id);
  var live=subs.filter(function(s){return PIPE_OUT.indexOf(s.status)<0;});
  var closed=subs.filter(function(s){return PIPE_OUT.indexOf(s.status)>=0;});
  var appts=DB.appts.filter(function(a){return a.jobId===j.id;});
  var pls=DB.placements.filter(function(p){return p.jobId===j.id;});
  var locked=['Closed','Cancelled'].indexOf(j.status)>=0;
  var tab=route.tab||'pipeline';

  var head=crumb([{v:'jobs',t:'Job Orders'},{v:'company',id:j.companyId,t:coName(j.companyId)},{t:j.title}])+
    recHead({type:'job',id:j.id,name:j.title,
      next:locked?null:{act:'match-job',id:j.id,label:'Find candidates'},
      actions:'<button class="btn ghost" data-act="edit-job" data-id="'+j.id+'">Edit</button>'+
        '<button class="btn ghost" data-act="note" data-jobid="'+j.id+'">Add Note</button>'+
        '<button class="btn ghost" data-act="email" data-to="contact" data-jid="'+j.id+'">Email Client</button>'+
        '<button class="btn ghost" data-act="job-status" data-id="'+j.id+'">Status</button>'+
        '<button class="btn ghost" data-act="actions" data-type="job" data-id="'+j.id+'">Actions \u25BE</button>',
      sub:esc(coName(j.companyId))+' &middot; '+esc(j.location)+' &middot; contact '+esc(ctName(j.contactId))+
        ' &middot; '+esc(j.status)+' &middot; added '+fmtD(j.added)+' ('+daysBetween(j.added,new Date())+
        ' days) &middot; record <span class="mono">'+esc(j.id)+'</span>'})+
    chevBar((function(){
      var best=-1;
      subs.forEach(function(x){var ix=pIx(x.status);if(ix>best)best=ix;});
      return best;
    })(),(function(){
      var best=-1;
      subs.forEach(function(x){var ix=pIx(x.status);if(ix>best)best=ix;});
      return best;
    })(),null)+
    rtabs([{k:'overview',t:'Overview'},{k:'pipeline',t:'Submissions',ct:live.length},
      {k:'appts',t:'Activity',ct:appts.length},{k:'notes',t:'Notes',ct:notes.length},
      {k:'placements',t:'Placements',ct:pls.length},
      {k:'files',t:'Files',ct:(j.files||[]).length},
      {k:'edit',t:'Edit',act:'edit-job'}],tab,'job',j.id,'job');

  var body='';
  if(tab==='pipeline'){
    body=funnelBar(subs)+
      (DB.training!==false
      ?'<p class="sub" style="margin:0 0 10px">Drag a card to the next column, or click it to open the submission. Statuses move one step at a time.</p>':'')+
      '<div class="ladder">'+PIPE.map(function(st){
      var here=live.filter(function(s){return s.status===st.k&&funnelKeeps(s);});
      return '<div class="rung"><div class="rung-h"><div class="t"><b style="background:'+st.c+'"></b>'+esc(st.k)+'</div>'+
        '<div class="c">'+here.length+' here \u00b7 '+f[st.k]+' reached</div></div>'+
        '<div class="rung-b" data-drop="'+esc(st.k)+'">'+
        (here.length?here.map(function(s){
          var stale=daysBetween(s.modified,new Date())>=5;
          return '<div class="chip'+(stale?' stale':'')+'" style="border-left-color:'+st.c+
            '" data-act="sub" data-id="'+s.id+'" data-sub="'+s.id+'" draggable="true" '+
            'role="button" tabindex="0" title="Open, or drag to the next status">'+
            '<div class="n">'+esc(candName(s.candidateId))+'</div>'+
            '<div class="m">'+esc((byId(DB.candidates,s.candidateId)||{}).occupation||'')+'</div>'+
            '<div class="d">'+esc(ago(s.modified))+(stale?' · ageing':'')+'</div></div>';
        }).join(''):'<div class="muted" style="font-size:11.5px">—</div>')+'</div></div>';
    }).join('')+'</div>'+
    (locked?'<div class="callout warn" style="margin-top:12px">This job order is '+esc(j.status)+
      (j.closedReason?' — '+esc(j.closedReason):'')+'. No further status changes are possible on its submissions.</div>':'')+
    (closed.length?'<div class="sec"><h3>Closed submissions <em>· '+closed.length+'</em></h3><div class="tw"><table>'+
      '<thead><tr><th>Candidate</th><th>Outcome</th><th>Reason</th><th>When</th></tr></thead><tbody>'+
      closed.map(function(s){
        return '<tr class="click" data-act="sub" data-id="'+s.id+'"><td><span class="lnk">'+esc(candName(s.candidateId))+'</span></td>'+
          '<td>'+subPill(s.status)+'</td><td class="muted">'+esc(s.reason||'no reason recorded')+'</td>'+
          '<td class="muted">'+esc(ago(s.modified))+'</td></tr>';
      }).join('')+'</tbody></table></div></div>':'');
  } else if(tab==='overview'){
    body=withDetails(
      '<div class="card" style="margin-bottom:13px"><div class="card-h"><h4>Job Details</h4>'+
        panelIcons()+'</div>'+
      detailRows([['Job Title',j.title],
        ['Company','<span class="lnk" data-go="company" data-id="'+j.companyId+'">'+
          esc(coName(j.companyId))+'</span>',1],
        ['Contact','<span class="lnk" data-go="contact" data-id="'+j.contactId+'">'+
          esc(ctName(j.contactId))+'</span>',1],
        ['Location',j.location],['Job Type',j.type],
        ['Employment Type',j.employmentType||(j.type==='Direct Hire'?'Permanent':'W2')],
        ['Openings',j.openings+' ('+j.filled+' filled)'],
        ['Anticipated Start',fmtD(j.startDate)],['Duration',j.duration]])+'</div>'+
      '<div class="card" style="margin-bottom:13px"><div class="card-h"><h4>Compensation</h4>'+
        panelIcons()+'</div>'+
      detailRows(j.type==='Direct Hire'
        ?[['Salary',j.salary?money(j.salary):'not recorded'],
          ['Flat Fee',j.flatFee?money(j.flatFee):'not recorded'],
          ['Fee as % of Salary',(j.salary&&j.flatFee)?Math.round(j.flatFee/j.salary*100)+'%':'\u2014'],
          ['Timesheets','Not applicable on a direct hire']]
        :[['Pay Rate',money(j.payRate)+' /hr'],['Bill Rate',money(j.billRate)+' /hr'],
          ['Mark-up Value',money(j.billRate-j.payRate)+' /hr'],
          ['Mark-up %',markup(j.payRate,j.billRate)+'%'],
          ['Gross Margin',marginPill(j.payRate,j.billRate)+' '+
            esc(marginBand(j.payRate,j.billRate).t),1]])+'</div>'+
      '<div class="card" style="margin-bottom:13px"><div class="card-h"><h4>Job Description</h4>'+
        panelIcons()+'</div><div class="card-b">'+
        '<p style="margin:0;font-size:13px;max-width:64ch">'+esc(j.description)+'</p>'+
        (j.closedReason?'<p class="muted" style="font-size:12px;margin:10px 0 0">Status reason: '+
          esc(j.closedReason)+'</p>':'')+'</div></div>'+
      '<div class="card"><div class="card-h"><h4>Recent Activity</h4>'+panelIcons()+'</div>'+
        '<div class="card-b">'+noteList(notes,'Nothing logged against this requirement.')+'</div></div>',
      [['ID',j.id],['Status',j.status],['Owner',j.owner],
       ['Assigned Users',(j.assignedUsers||[j.owner]).join(', ')],
       ['Category',j.category],['Openings',String(j.openings)],
       ['Filled',String(j.filled)],
       ['Sendouts',String(subs.filter(function(x){return !!x.sendoutAt;}).length)],
       ['Submitted',String(subs.length)],
       ['Published',j.published?'Yes':'No'],['Date Added',fmtD(j.added)]]);
  } else if(tab==='files'){
    body='<div class="card"><div class="card-h"><h4>Files</h4>'+panelIcons()+'</div>'+
      '<div class="empty" style="padding:22px"><b>No files on this job order</b>'+
      'Job specifications and client paperwork would be attached here.</div></div>';
  } else if(tab==='appts'){
    body=appts.length?'<div class="tw"><table><thead><tr><th>Subject</th><th>When</th><th>Format</th><th>Attendees</th></tr></thead><tbody>'+
      appts.map(function(a){
        return '<tr><td style="font-weight:500">'+esc(a.subject)+'</td><td>'+esc(fmtDT(a.at))+'</td>'+
          '<td class="muted">'+esc(a.location)+'</td><td class="muted">'+esc(a.attendees)+'</td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>No appointments</b>Move a submission to Interview Scheduled to create one.</div>';
  } else if(tab==='placements'){
    body=pls.length?'<div class="tw"><table><thead><tr><th>Worker</th><th>Status</th><th>Start</th>'+
      '<th class="num">Bill rate</th><th class="num">Margin</th></tr></thead><tbody>'+
      pls.map(function(p){
        return '<tr class="click" data-go="placement" data-id="'+p.id+'"><td><span class="lnk">'+esc(candName(p.candidateId))+'</span></td>'+
          '<td>'+plPill(p)+'</td><td class="muted">'+fmtD(p.start)+'</td>'+
          '<td class="num">'+money(p.billRate)+'</td><td class="num">'+margin(p.payRate,p.billRate)+'%</td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>No placements</b>Nothing on this job order has reached Placed.</div>';
  } else {
    body='<div class="card"><div class="card-b">'+noteList(notes,'No client conversations logged against this requirement.')+'</div></div>';
  }
  return head+'<div class="tabbody">'+body+'</div>';
}

function vCandidate(){
  var c=byId(DB.candidates,route.id);
  if(!c)return notFound();
  var subs=candSubs(c.id),notes=notesFor('candidateId',c.id);
  var pls=DB.placements.filter(function(p){return p.candidateId===c.id;});
  var sheets=DB.tearsheets.filter(function(t){return t.candidateIds.indexOf(c.id)>=0;});
  var tab=route.tab||'overview';
  var best=-1,bestOut=null;
  subs.forEach(function(x){
    var ix=pIx(x.status);
    if(ix>best)best=ix;
    if(PIPE_OUT.indexOf(x.status)>=0&&bestOut==null)bestOut=x.status;
  });
  var head=crumb([{v:'candidates',t:'Candidates'},{t:c.name}])+
    recHead({type:'candidate',id:c.id,name:c.name,
    next:c.cv?{act:'pipeline-add',id:c.id,label:'Add to pipeline'}:{act:'upload-cv',id:c.id,label:'Upload CV'},
    actions:'<button class="btn ghost" data-act="edit-candidate" data-id="'+c.id+'">Edit</button>'+
      '<button class="btn ghost" data-act="email" data-to="candidate" data-cid="'+c.id+'">Email</button>'+
      '<button class="btn ghost" data-act="upload-cv" data-id="'+c.id+'">'+(c.cv?'Replace CV':'Upload CV')+'</button>'+
      '<button class="btn ghost" data-act="note" data-candidateid="'+c.id+'">Add Note</button>'+
      '<button class="btn ghost" data-act="actions" data-type="candidate" data-id="'+c.id+'">Actions \u25BE</button>',
    sub:esc(c.occupation)+' &middot; '+esc(c.location)+' &middot; '+esc(c.status)+
      ' &middot; sourced via '+esc(c.source)+' &middot; record <span class="mono">'+esc(c.id)+'</span>'})+
    rtabs([{k:'overview',t:'Overview'},{k:'activity',t:'Activity',ct:activityFor(c.id).length},
      {k:'notes',t:'Notes',ct:notes.length},
      {k:'subs',t:'Submissions',ct:subs.length},
      {k:'placements',t:'Placements',ct:pls.length},
      {k:'files',t:'Files',ct:fileList(c).length},
      {k:'resume',t:'Resume',ct:c.cv?'1':'0'},
      {k:'sheets',t:'Tearsheets',ct:sheets.length},
      {k:'edit',t:'Edit',act:'edit-candidate'}],tab,'candidate',c.id,'candidate')+
    chevBar(best,best,bestOut);

  var body='';
  if(tab==='overview'){
    var nm=String(c.name).split(' ');
    body=withDetails(
      '<div class="card" style="margin-bottom:13px"><div class="card-h"><h4>Contact Information</h4>'+
        panelIcons()+'</div>'+
      detailRows([
        ['Email 1','<span class="lnk">'+esc(c.email||'')+'</span>',1],
        ['Email 2',c.email2||''],['Mobile Phone',c.phone||''],
        ['Phone 2',c.phone2||''],['Phone 3',c.phone3||''],
        ['Address',c.location||'']])+'</div>'+
      '<div class="card" style="margin-bottom:13px"><div class="card-h"><h4>Recent Notes</h4>'+
        panelIcons()+'</div><div class="card-b">'+
      (notes.length?noteList(notes,''):'<div class="empty" style="padding:16px 8px">'+
        '<b>You do not have any notes on this record yet.</b>'+
        '<div style="margin-top:10px"><button class="btn" data-act="note" data-candidateid="'+c.id+
        '">ADD NOTE +</button></div></div>')+'</div></div>'+
      '<div class="card" style="margin-bottom:13px"><div class="card-h"><h4>Resume</h4>'+
        panelIcons()+'</div><div class="card-b">'+
      (c.cv?'<pre style="margin:0;white-space:pre-wrap;font-family:var(--mono);font-size:11.5px;'+
        'line-height:1.5;max-height:190px;overflow:auto">'+esc(c.cv.slice(0,900))+
        (c.cv.length>900?'\n\u2026':'')+'</pre>'
        :'<div class="muted" style="font-size:13px">No resume on file.</div>')+'</div></div>'+
      '<div class="card"><div class="card-h"><h4>Open Tasks</h4>'+panelIcons()+'</div><div class="card-b">'+
      (function(){
        var mine=DB.tasks.filter(function(t){return !t.done&&t.entity===c.id;});
        return mine.length?taskTable(mine):'<div class="muted" style="font-size:13px">No open tasks on this record.</div>';
      })()+'</div></div>',
      [['ID',c.id],['First Name',c.firstName||nm[0]||''],
       ['Last Name',c.lastName||nm.slice(1).join(' ')],
       ['Occupation',c.occupation],['Status',c.status],['Category',c.category],
       ['Source',c.source],['Owner',c.owner],
       ['Date Available',c.availability],['Desired Rate',money(c.desiredRate)+' /hr'],
       ['Employment Preference',c.employmentPref],
       ['Primary Skills',(c.skills||[]).map(function(x){
         return '<span class="tag">'+esc(x)+'</span>';}).join('')||'\u2014',1],
       ['Resume',c.cv?esc(c.cvName||'on file'):'none on file'],
       ['Date Added',fmtD(c.added)],
       ['Date Last Modified',c.edited?fmtD(c.edited):fmtD(c.added)]]);
  } else if(tab==='activity'){
    body='<div class="card"><div class="card-h"><h4>Activity</h4>'+panelIcons()+'</div><div class="card-b">'+
      activityList(activityFor(c.id),'Nothing has happened on this record yet.')+'</div></div>';
  } else if(tab==='files'){
    body=filesPanel(c);
  } else if(tab==='resume'||tab==='cv'){
    var rf=resumeFile(c);
    body=c.cv
      ?'<div class="card"><div class="card-h"><h4>'+esc(c.cvName||'Resume')+'</h4>'+
        '<span class="pill p-open">parsed text</span><span class="sp"></span>'+
        '<span class="muted mono">'+c.cv.split(/\s+/).filter(Boolean).length+' words \u00b7 added '+fmtD(c.cvAt)+'</span>'+
        (rf?'<button class="btn sm" data-act="parse-existing" data-cand="'+c.id+'" data-id="'+rf.id+
          '">Parse as Existing</button>':'')+
        '<button class="btn ghost sm" data-act="upload-cv" data-id="'+c.id+'">Replace</button></div>'+
        '<div class="card-b"><pre style="margin:0;white-space:pre-wrap;font-family:var(--mono);font-size:12px;'+
        'line-height:1.55;max-width:96ch">'+esc(c.cv)+'</pre></div></div>'
      :'<div class="empty"><b>No CV on file</b>Without CV text this candidate is invisible to boolean search on anything beyond the fields above.'+
        '<div style="margin-top:11px"><button class="btn" data-act="upload-cv" data-id="'+c.id+'">Upload CV</button></div></div>';
  } else if(tab==='subs'){
    body=subs.length?'<div class="tw"><table><thead><tr><th>Job order</th><th>Company</th><th>Status</th><th>Sendout</th><th>Modified</th><th></th></tr></thead><tbody>'+
      subs.map(function(s){
        var j=byId(DB.jobs,s.jobId);
        return '<tr><td><span class="lnk" data-go="job" data-id="'+s.jobId+'">'+esc(jobName(s.jobId))+'</span></td>'+
          '<td class="muted">'+esc(coName(j?j.companyId:''))+'</td><td>'+subPill(s.status)+'</td>'+
          '<td class="muted">'+(s.sendoutAt?fmtD(s.sendoutAt):'—')+'</td>'+
          '<td class="muted">'+esc(ago(s.modified))+'</td>'+
          '<td style="text-align:right"><button class="btn ghost sm" data-act="sub" data-id="'+s.id+'">Open</button></td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>Not on any pipeline</b>A candidate record with no submission produces nothing.</div>';
  } else if(tab==='placements'){
    body=pls.length?'<div class="tw"><table><thead><tr><th>Job order</th><th>Status</th><th>Start</th><th>End</th><th class="num">Pay rate</th></tr></thead><tbody>'+
      pls.map(function(p){
        return '<tr class="click" data-go="placement" data-id="'+p.id+'"><td><span class="lnk">'+esc(jobName(p.jobId))+'</span></td>'+
          '<td>'+plPill(p)+'</td><td class="muted">'+fmtD(p.start)+'</td><td class="muted">'+fmtD(p.end)+'</td>'+
          '<td class="num">'+money(p.payRate)+'</td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>No placements</b></div>';
  } else if(tab==='sheets'){
    body=sheets.length?'<div class="tw"><table><tbody>'+sheets.map(function(t){
        return '<tr class="click" data-go="tearsheet" data-id="'+t.id+'"><td><span class="lnk">'+esc(t.name)+'</span></td>'+
          '<td class="num">'+t.candidateIds.length+' candidates</td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>Not on any tearsheet</b>Tearsheets are how you avoid re-running the same search next month.</div>';
  } else {
    body='<div class="card"><div class="card-b">'+noteList(notes,'No contact history.')+'</div></div>';
  }
  return head+'<div class="tabbody">'+body+'</div>';
}

function vPipeline(){
  var live=liveSubs();
  var groups=PIPE_K.map(function(k){return {k:k,rows:live.filter(function(s){return s.status===k;})};})
    .filter(function(g){return g.rows.length;});
  return '<div class="h"><h2>Submissions</h2><span class="sp"></span><button class="btn" data-act="pipeline-add">Add to pipeline</button></div>'+
    '<p class="sub">Every live submission across the desk. '+staleSubs().length+' have had no status change in five days or more.</p>'+
    (groups.length?groups.map(function(g){
      return '<div class="sec"><h3><span class="pill p-open"><i style="background:'+pColor(g.k)+'"></i>'+esc(g.k)+'</span> <em>· '+g.rows.length+'</em></h3>'+
        '<div class="tw"><table><thead><tr><th>Candidate</th><th>Job order</th><th>Company</th><th>Owner</th><th>Days at status</th><th></th></tr></thead><tbody>'+
        g.rows.sort(function(a,b){return new Date(a.modified)-new Date(b.modified);}).map(function(s){
          var d=daysBetween(s.modified,new Date()),j=byId(DB.jobs,s.jobId);
          return '<tr class="click" data-act="sub" data-id="'+s.id+'"><td><span class="lnk">'+esc(candName(s.candidateId))+'</span>'+
            (s.mine?' <span class="tag">yours</span>':'')+'</td>'+
            '<td class="muted">'+esc(jobName(s.jobId))+'</td><td class="muted">'+esc(coName(j?j.companyId:''))+'</td>'+
            '<td class="muted">'+esc(s.owner)+'</td>'+
            '<td>'+(d>=5?'<span class="pill p-bad">'+d+' days</span>':'<span class="muted">'+d+'</span>')+'</td>'+
            '<td style="text-align:right"><span class="lnk">Open</span></td></tr>';
        }).join('')+'</tbody></table></div></div>';
    }).join(''):'<div class="empty"><b>No live submissions</b>Add a candidate to a job order pipeline.</div>');
}

A.openSub=function(id){
  var s=byId(DB.subs,id);
  if(!s)return;
  var j=byId(DB.jobs,s.jobId),c=byId(DB.candidates,s.candidateId);
  var ix=pIx(s.status),out=PIPE_OUT.indexOf(s.status)>=0;
  var next=(!out&&ix<PIPE_K.length-1)?PIPE_K[ix+1]:null;
  var locked=['Closed','Cancelled'].indexOf(j.status)>=0;
  var rows=[];
  rows.push(['Job order',j.title+' · '+coName(j.companyId)]);
  rows.push(['Candidate',c.name+' · '+c.occupation]);
  if(s.screenNote)rows.push(['Screening notes',s.screenNote]);
  if(s.summary)rows.push(['Client summary',s.summary]);
  if(s.payRate)rows.push(['Rates',money(s.payRate)+' pay · '+money(s.billRate)+' bill · markup '+
    markup(s.payRate,s.billRate)+'% · gross margin '+margin(s.payRate,s.billRate)+'%']);
  if(s.sendoutAt)rows.push(['Sendout',fmtD(s.sendoutAt)+' to '+ctName(s.sentTo)]);
  if(s.apptId){var a=byId(DB.appts,s.apptId);if(a)rows.push(['Interview',fmtDT(a.at)+' · '+a.location+' · '+a.attendees]);}
  if(s.startDate)rows.push(['Start date',fmtD(s.startDate)]);
  if(s.reason)rows.push(['Closure reason',s.reason]);

  var root=document.getElementById('modal-root');
  root.innerHTML='<div class="scrim" data-scrim><div class="modal wide" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>'+esc(c.name)+' · '+esc(j.title)+'</h4>'+
      '<p>Submission <span class="mono">'+esc(s.id)+'</span> · owner '+esc(s.owner)+' · '+
      (out?'closed':'status '+(ix+1)+' of '+PIPE_K.length)+'</p></div>'+
    '<div class="modal-b">'+
      '<div style="display:flex;align-items:center;gap:9px;margin-bottom:14px;flex-wrap:wrap">'+subPill(s.status)+
      '<span class="muted" style="font-size:12.5px">last changed '+esc(ago(s.modified))+
      ' · on pipeline '+daysBetween(s.added,new Date())+' days</span></div>'+
      (locked?'<div class="callout warn">The job order is '+esc(j.status)+', so this submission is read only.</div>':'')+
      (next&&!locked?'<div class="callout"><b>Next status: '+esc(next)+'.</b> '+esc((PIPE[ix+1]||{}).help||'')+'</div>':'')+
      '<div class="kv" style="margin-bottom:16px">'+rows.map(function(r){
        return '<dt>'+esc(r[0])+'</dt><dd style="font-weight:400;max-width:60ch">'+esc(r[1])+'</dd>';}).join('')+'</div>'+
      '<h4 style="font-size:13px;margin:0 0 8px">Status history</h4><div class="tl">'+
      s.history.slice().reverse().map(function(h){
        return '<div class="tl-i"><div class="m">'+esc(fmtDT(h.at))+' · '+esc(h.by)+'</div>'+
          '<div class="t">'+subPill(h.status)+'</div></div>';}).join('')+'</div></div>'+
    '<div class="modal-f"><button class="btn ghost" data-close>Close</button>'+
      '<button class="btn ghost" data-email>Email</button>'+
      '<button class="btn ghost" data-note>Add Note</button>'+
      (!out&&!locked?'<button class="btn danger" data-reject>Close submission</button>':'')+
      (next&&!locked?'<button class="btn" data-adv>Change status to '+esc(next)+'</button>':'')+
    '</div></div></div>';
  root.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',function(){root.innerHTML='';});});
  var rb=root.querySelector('[data-reject]'),ab=root.querySelector('[data-adv]'),nb=root.querySelector('[data-note]');
  if(rb)rb.addEventListener('click',function(){root.innerHTML='';A.reject(id);});
  if(ab)ab.addEventListener('click',function(){root.innerHTML='';A.advance(id);});
  var eb=root.querySelector('[data-email]');
  if(eb)eb.addEventListener('click',function(){root.innerHTML='';
    A.email({to:'contact',subId:s.id,template:'sendout'});});
  if(nb)nb.addEventListener('click',function(){root.innerHTML='';
    A.addNote({candidateId:s.candidateId,jobId:s.jobId,companyId:j.companyId,contactId:s.sentTo||j.contactId});});
  root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
    if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
};

function vTearsheets(){
  return '<div class="h"><h2>Tearsheets</h2><span class="sp"></span><div class="btnrow">'+
    '<button class="btn ghost" data-act="tearsheet-add">Add candidate to a tearsheet</button>'+
    '<button class="btn" data-act="add-tearsheet">Add Tearsheet</button></div></div>'+
    '<p class="sub">Saved candidate lists for recurring requirements. Built once, they remove the repeat search entirely.</p>'+
    (DB.tearsheets.length?'<div class="tw"><table><thead><tr><th>Tearsheet</th><th>Description</th><th>Owner</th><th class="num">Candidates</th></tr></thead><tbody>'+
      DB.tearsheets.map(function(t){
        return '<tr class="click" data-go="tearsheet" data-id="'+t.id+'"><td><span class="lnk">'+esc(t.name)+'</span>'+
          (t.mine?' <span class="tag">yours</span>':'')+'</td>'+
          '<td class="muted">'+esc(t.description)+'</td><td class="muted">'+esc(t.owner)+'</td>'+
          '<td class="num">'+t.candidateIds.length+'</td></tr>';
      }).join('')+'</tbody></table></div>'
    :'<div class="empty"><b>No tearsheets</b>Create one for a requirement you fill repeatedly.</div>');
}
function vTearsheet(){
  var t=byId(DB.tearsheets,route.id);
  if(!t)return notFound();
  return crumb([{v:'tearsheets',t:'Tearsheets'},{t:t.name}])+
    recHead({type:'tearsheet',id:t.id,name:t.name,
      next:{act:'tearsheet-add',id:t.id,label:'Add candidate'},
      actions:'<button class="btn ghost" data-act="edit-tearsheet" data-id="'+t.id+'">Edit</button>',
      sub:esc(t.description)+' \u00b7 owner '+esc(t.owner)+' \u00b7 '+t.candidateIds.length+
        ' candidates \u00b7 record <span class="mono">'+esc(t.id)+'</span>'})+
    '<p class="sub">'+esc(t.description)+' · owner '+esc(t.owner)+' · record <span class="mono">'+esc(t.id)+'</span></p>'+
    (t.candidateIds.length?'<div class="tw"><table><thead><tr><th>Candidate</th><th>Occupation</th><th>Status</th>'+
      '<th>Availability</th><th class="num">Rate</th><th></th></tr></thead><tbody>'+
      t.candidateIds.map(function(id){
        var c=byId(DB.candidates,id);
        if(!c)return '';
        return '<tr class="click" data-go="candidate" data-id="'+c.id+'"><td><span class="lnk">'+esc(c.name)+'</span></td>'+
          '<td class="muted">'+esc(c.occupation)+'</td><td>'+cdPill(c)+'</td>'+
          '<td>'+esc(c.availability)+'</td><td class="num">'+money(c.desiredRate)+'</td>'+
          '<td style="text-align:right"><span class="lnk" data-act="tearsheet-remove" data-id="'+t.id+
          '" data-cand="'+c.id+'">remove</span></td></tr>';
      }).join('')+'</tbody></table></div>'
    :'<div class="empty"><b>Empty tearsheet</b>Add candidates who qualify against the description.</div>');
}

function vPlacements(){
  return '<div class="h"><h2>Placements</h2></div>'+
    '<p class="sub">Where the front office hands over. A placement is finished when it is approved, onboarding is clear and hours are flowing.</p>'+
    (DB.placements.length?'<div class="tw"><table><thead><tr><th>Worker</th><th>Job order</th><th>Company</th>'+
      '<th>Status</th><th>Onboarding</th><th class="num">Markup</th><th class="num">Margin</th><th>Start</th></tr></thead><tbody>'+
      DB.placements.map(function(p){
        var j=byId(DB.jobs,p.jobId);
        var done=ONBOARD.filter(function(o){return p.onboard[o.k];}).length;
        return '<tr class="click" data-go="placement" data-id="'+p.id+'">'+
          '<td><span class="lnk">'+esc(candName(p.candidateId))+'</span>'+(p.mine?' <span class="tag">yours</span>':'')+'</td>'+
          '<td class="muted">'+esc(jobName(p.jobId))+'</td><td class="muted">'+esc(coName(j?j.companyId:''))+'</td>'+
          '<td>'+plPill(p)+'</td>'+
          '<td>'+(done===ONBOARD.length?'<span class="pill p-good">complete</span>':'<span class="pill p-bad">'+done+' of '+ONBOARD.length+'</span>')+'</td>'+
          '<td class="num">'+markup(p.payRate,p.billRate)+'%</td>'+
          '<td class="num">'+margin(p.payRate,p.billRate)+'%</td>'+
          '<td class="muted">'+fmtD(p.start)+'</td></tr>';
      }).join('')+'</tbody></table></div>'
    :'<div class="empty"><b>No placements</b>Take a candidate through to Placed on a job order pipeline.</div>');
}
function vPlacement(){
  var p=byId(DB.placements,route.id);
  if(!p)return notFound();
  var j=byId(DB.jobs,p.jobId);
  var times=DB.times.filter(function(t){return t.placementId===p.id;})
    .sort(function(a,b){return new Date(b.weekEnding)-new Date(a.weekEnding);});
  var gaps=ONBOARD.filter(function(o){return !p.onboard[o.k];});
  var notes=notesFor('candidateId',p.candidateId);
  var tab=route.tab||'overview';
  var head=crumb([{v:'placements',t:'Placements'},{v:'job',id:p.jobId,t:jobName(p.jobId)},{t:candName(p.candidateId)}])+
    recHead({type:'placement',id:p.id,name:candName(p.candidateId),
      next:p.status==='Pending Approval'
        ?{act:'approve-pl',id:p.id,label:'Approve placement'}
        :{act:'time-add',id:p.id,label:'Add time entry'},
      actions:'<button class="btn ghost" data-act="edit-placement" data-id="'+p.id+'">Edit</button>'+
        '<button class="btn ghost" data-act="note" data-candidateid="'+p.candidateId+'">Add Note</button>'+
        '<button class="btn ghost" data-act="actions" data-type="placement" data-id="'+p.id+
          '">Actions \u25BE</button>',
      sub:esc(jobName(p.jobId))+' at '+esc(coName((byId(DB.jobs,p.jobId)||{}).companyId))+
        ' \u00b7 '+esc(p.status)+' \u00b7 '+esc(p.employmentType||'')+
        ' \u00b7 record <span class="mono">'+esc(p.id)+'</span>'})+
    '<p class="sub">'+esc(jobName(p.jobId))+' at '+esc(coName(j?j.companyId:''))+' · record <span class="mono">'+esc(p.id)+'</span></p>'+
    '<div class="snap">'+
      '<div><div class="k">Employment type</div><div class="v">'+esc(p.employmentType)+'</div></div>'+
      '<div><div class="k">Start</div><div class="v">'+fmtD(p.start)+'</div></div>'+
      '<div><div class="k">End</div><div class="v">'+fmtD(p.end)+'</div></div>'+
      '<div><div class="k">Pay rate</div><div class="v">'+money(p.payRate)+'/hr</div></div>'+
      '<div><div class="k">Bill rate</div><div class="v">'+money(p.billRate)+'/hr</div></div>'+
      '<div><div class="k">Markup</div><div class="v">'+markup(p.payRate,p.billRate)+'%</div></div>'+
      '<div><div class="k">Gross margin</div><div class="v">'+margin(p.payRate,p.billRate)+'%</div></div>'+
      '<div><div class="k">Approved by</div><div class="v">'+esc(p.approvedBy||'—')+'</div></div>'+
    '</div>'+
    rtabs([{k:'overview',t:'Onboarding',ct:ONBOARD.length-gaps.length+'/'+ONBOARD.length},
      {k:'time',t:'Time Entries',ct:times.length},{k:'notes',t:'Notes',ct:notes.length}],tab,'placement',p.id);

  var body='';
  if(tab==='overview'){
    body=(p.status==='Pending Approval'?'<div class="callout warn">Pending approval. Nothing bills and no hours can be entered until a manager approves the rates and dates against the signed contract.</div>':'')+
      '<div class="card"><div class="card-h"><h4>Onboarding pack</h4><span class="sp"></span>'+
      (gaps.length?'<span class="pill p-bad">'+gaps.length+' outstanding</span>':'<span class="pill p-good">complete</span>')+
      '</div><div class="card-b"><div class="chk">'+ONBOARD.map(function(o){
        var on=p.onboard[o.k];
        return '<div class="chk-i'+(on?' done':'')+'">'+
          '<span class="bx" data-act="onboard" data-id="'+p.id+'" data-key="'+o.k+
          '" role="checkbox" tabindex="0" aria-checked="'+on+'" '+
          'aria-label="'+(on?'Reopen: ':'Mark complete: ')+esc(o.t)+'" '+
          'title="'+(on?'Reopen':'Mark complete')+'">'+(on?'\u2713':'')+'</span>'+
          '<span class="tx">'+esc(o.t)+'<span class="hint">'+esc(o.h)+'</span></span></div>';
      }).join('')+'</div>'+
      (gaps.length?'<div class="callout bad" style="margin:14px 0 0">Time entry is blocked while items are outstanding. An unverified worker cannot be invoiced.</div>':'')+
      '</div></div>';
  } else if(tab==='time'){
    body=times.length?'<div class="tw"><table><thead><tr><th>Week ending</th><th class="num">Regular</th>'+
      '<th class="num">Overtime</th><th class="num">Billable</th><th>Status</th><th>Note</th><th></th></tr></thead><tbody>'+
      times.map(function(t){
        var m={Approved:'p-good',Rejected:'p-bad',Submitted:'p-warn'};
        var bill=Math.round(p.billRate*t.regular+p.billRate*1.5*t.overtime);
        return '<tr><td>'+fmtD(t.weekEnding)+'</td><td class="num">'+t.regular+'</td>'+
          '<td class="num">'+t.overtime+'</td><td class="num">'+money(bill)+'</td>'+
          '<td><span class="pill '+m[t.status]+'">'+esc(t.status)+'</span></td>'+
          '<td class="muted" style="font-size:12px">'+esc(t.note||'—')+'</td>'+
          '<td style="text-align:right">'+(t.status==='Submitted'?'<button class="btn ghost sm" data-act="time-decide" data-id="'+t.id+'">Approve</button>':'')+'</td></tr>';
      }).join('')+'</tbody></table></div>'
      :'<div class="empty"><b>No hours yet</b>Add the first time entry once the placement is approved and onboarding is clear.</div>';
  } else {
    body='<div class="card"><div class="card-b">'+noteList(notes,'Nothing logged.')+'</div></div>';
  }
  return head+'<div class="tabbody">'+body+'</div>';
}

function vApprovals(){
  var pend=pendingTime();
  var rest=DB.times.filter(function(t){return t.status!=='Submitted';})
    .sort(function(a,b){return new Date(b.weekEnding)-new Date(a.weekEnding);});
  function row(t,act){
    var p=byId(DB.placements,t.placementId);
    var j=p?byId(DB.jobs,p.jobId):null;
    var m={Approved:'p-good',Rejected:'p-bad',Submitted:'p-warn'};
    var bill=p?Math.round(p.billRate*t.regular+p.billRate*1.5*t.overtime):0;
    return '<tr><td><span class="lnk" data-go="placement" data-id="'+t.placementId+'">'+esc(candName(p?p.candidateId:''))+'</span></td>'+
      '<td class="muted">'+esc(coName(j?j.companyId:''))+'</td><td>'+fmtD(t.weekEnding)+'</td>'+
      '<td class="num">'+t.regular+'</td><td class="num">'+t.overtime+'</td><td class="num">'+money(bill)+'</td>'+
      '<td><span class="pill '+m[t.status]+'">'+esc(t.status)+'</span></td>'+
      '<td style="text-align:right">'+(act?'<button class="btn sm" data-act="time-decide" data-id="'+t.id+'">Approve</button>'
        :'<span class="muted" style="font-size:12px">'+esc(t.note?t.note.slice(0,36):'—')+'</span>')+'</td></tr>';
  }
  var head='<thead><tr><th>Worker</th><th>Company</th><th>Week ending</th><th class="num">Regular</th>'+
    '<th class="num">Overtime</th><th class="num">Billable</th><th>Status</th><th></th></tr></thead>';
  return '<div class="h"><h2>Time &amp; Expense</h2></div>'+
    '<p class="sub">Approval authorises the invoice. Check hours against the assignment and the roster before releasing them.</p>'+
    (pendingPlacements().length?'<div class="sec"><h3>Placements pending approval <em>· '+pendingPlacements().length+'</em></h3>'+
      '<div class="tw"><table><thead><tr><th>Worker</th><th>Job order</th><th class="num">Margin</th><th></th></tr></thead><tbody>'+
      pendingPlacements().map(function(p){
        return '<tr><td><span class="lnk" data-go="placement" data-id="'+p.id+'">'+esc(candName(p.candidateId))+'</span></td>'+
          '<td class="muted">'+esc(jobName(p.jobId))+'</td><td class="num">'+margin(p.payRate,p.billRate)+'%</td>'+
          '<td style="text-align:right"><button class="btn sm" data-act="approve-pl" data-id="'+p.id+'">Approve</button></td></tr>';
      }).join('')+'</tbody></table></div></div>':'')+
    '<div class="sec"><h3>Time awaiting approval <em>· '+pend.length+'</em></h3>'+
      (pend.length?'<div class="tw"><table>'+head+'<tbody>'+pend.map(function(t){return row(t,true);}).join('')+'</tbody></table></div>'
       :'<div class="empty"><b>Nothing pending</b>Hours submitted against a placement land here for approval.</div>')+'</div>'+
    (rest.length?'<div class="sec"><h3>Decided <em>· '+rest.length+'</em></h3><div class="tw"><table>'+head+'<tbody>'+
      rest.map(function(t){return row(t,false);}).join('')+'</tbody></table></div></div>':'');
}

function vNotes(){
  var rows=DB.notes.slice().sort(function(a,b){return new Date(b.at)-new Date(a.at);});
  var counts={};
  NOTE_ACTIONS.forEach(function(a){counts[a]=0;});
  rows.forEach(function(n){counts[n.action]=(counts[n.action]||0)+1;});
  return '<div class="h"><h2>All Notes</h2><span class="sp"></span><button class="btn" data-act="note">Add Note</button></div>'+
    '<p class="sub">Activity is counted by action, not by note volume. '+rows.length+' notes recorded.</p>'+
    '<div class="grid g4" style="margin-bottom:18px">'+NOTE_ACTIONS.slice(0,4).map(function(a){
      return met(a,counts[a]||0,'logged');}).join('')+'</div>'+
    '<div class="tw"><table><thead><tr><th style="width:110px">Action</th><th>Comments</th><th style="width:210px">Linked to</th>'+
    '<th style="width:110px">By</th><th style="width:110px">When</th><th></th></tr></thead><tbody>'+
    rows.map(function(n){
      var links=[];
      if(n.links.candidateId)links.push('<span class="lnk" data-go="candidate" data-id="'+n.links.candidateId+'">'+esc(candName(n.links.candidateId))+'</span>');
      if(n.links.contactId)links.push('<span class="lnk" data-go="contact" data-id="'+n.links.contactId+'">'+esc(ctName(n.links.contactId))+'</span>');
      if(n.links.companyId)links.push('<span class="lnk" data-go="company" data-id="'+n.links.companyId+'">'+esc(coName(n.links.companyId))+'</span>');
      if(n.links.jobId)links.push('<span class="lnk" data-go="job" data-id="'+n.links.jobId+'">'+esc(jobName(n.links.jobId))+'</span>');
      return '<tr><td><span class="pill p-flat">'+esc(n.action)+'</span></td>'+
        '<td>'+esc(n.text)+'</td><td style="font-size:12px">'+(links.join(', ')||'<span class="muted">unlinked</span>')+'</td>'+
        '<td class="muted">'+esc(n.by)+'</td><td class="muted">'+esc(ago(n.at))+'</td>'+
        '<td style="width:48px;text-align:right"><span class="lnk" data-act="edit-note" data-id="'+n.id+'">edit</span></td></tr>';
    }).join('')+'</tbody></table></div>';
}

function vReports(){
  SEEN.reports=true;
  var chartCards='<div class="sec"><h3>Charts <em>\u00b7 add or remove what you need</em>'+
    '<span style="float:right"><button class="btn sm" data-act="dash-add">Add Card</button></span></h3>'+
    '<div class="dashgrid" style="margin-top:0">'+dashCards().map(function(k){
      var card=DASH_CARDS[k];
      return '<div class="card dashcard"><div class="card-h"><h4>'+esc(card.t)+'</h4>'+
        '<span class="sp"></span><span class="pi">'+
        '<button data-act="refresh" title="Refresh" aria-label="Refresh">\u21BB</button>'+
        '<button data-act="dash-hide" data-id="'+k+'" title="Remove this card" '+
          'aria-label="Remove this card">\u2297</button></span></div>'+
        card.build()+'</div>';
    }).join('')+'</div></div>';
  var f=funnel(DB.subs),tf=timeToFill();
  var src={};
  DB.candidates.forEach(function(c){
    src[c.source]=src[c.source]||{n:0,sent:0,placed:0};
    src[c.source].n++;
    var ss=candSubs(c.id);
    if(ss.some(function(s){return !!s.sendoutAt;}))src[c.source].sent++;
    if(ss.some(function(s){return s.status==='Placed';}))src[c.source].placed++;
  });
  var flags=[];
  staleSubs().forEach(function(s){
    flags.push(['Ageing submission',candName(s.candidateId)+' on '+jobName(s.jobId)+' — '+
      daysBetween(s.modified,new Date())+' days at '+s.status,'sub',s.id]);});
  openJobs().filter(function(j){return jobSubs(j.id).length===0;}).forEach(function(j){
    flags.push(['Empty pipeline',j.title+' at '+coName(j.companyId)+' — live '+
      daysBetween(j.added,new Date())+' days with no candidates','job',j.id]);});
  pendingPlacements().forEach(function(p){
    flags.push(['Placement unapproved',candName(p.candidateId)+' — pending approval, nothing billable','placement',p.id]);});
  onboardGaps().forEach(function(p){
    var g=ONBOARD.filter(function(o){return !p.onboard[o.k];}).length;
    flags.push(['Onboarding gap',candName(p.candidateId)+' — '+g+' item(s) outstanding','placement',p.id]);});
  pendingTime().forEach(function(t){
    var p=byId(DB.placements,t.placementId);
    flags.push(['Unapproved hours',candName(p?p.candidateId:'')+' — week ending '+fmtD(t.weekEnding)+' not decided','placement',t.placementId]);});
  DB.candidates.filter(function(c){
    var n=notesFor('candidateId',c.id)[0];
    return candSubs(c.id).length>0&&(!n||daysBetween(n.at,new Date())>7);
  }).forEach(function(c){
    flags.push(['No recent contact',c.name+' is on a live pipeline with no note in the last week','candidate',c.id]);});
  DB.jobs.filter(function(j){
    return ['Closed','Cancelled','Filled'].indexOf(j.status)<0&&j.filled>=j.openings;
  }).forEach(function(j){
    flags.push(['Status misstated',j.title+' at '+coName(j.companyId)+' is fully filled but still '+j.status,'job',j.id]);});

  return '<div class="h"><h2>Reports</h2><span class="sp"></span><button class="btn" data-act="review">Weekly desk review</button></div>'+
    '<p class="sub">Read the numbers, then decide what changes. A report that does not end in an action is a status update.</p>'+
    '<div class="grid g4">'+
      met('Sendouts',sendouts().length,'submissions that reached a client')+
      met('Sendout to interview',pct(f['Interview Scheduled'],f['Client Submission'])+'%','conversion at the client gate')+
      met('Interview to placement',pct(f['Placed'],f['Interview Scheduled'])+'%','conversion after interview')+
      met('Average time to fill',tf==null?'—':tf+' days','job order added to placed')+
    '</div>'+
    '<div class="grid g4" style="margin-top:13px">'+
      met('Candidate records',DB.candidates.length,'across '+Object.keys((function(){var o={};
        DB.candidates.forEach(function(c){o[c.category]=1;});return o;})()).length+' categories')+
      met('CV coverage',pct(DB.candidates.filter(function(c){return !!c.cv;}).length,DB.candidates.length)+'%',
        DB.candidates.filter(function(c){return !c.cv;}).length+' records with no searchable CV',
        pct(DB.candidates.filter(function(c){return !!c.cv;}).length,DB.candidates.length)<80?'dn':'up')+
      met('Sourceable',DB.candidates.filter(function(c){
        return ['Do Not Call','Archive'].indexOf(c.status)<0;}).length,
        DB.candidates.filter(function(c){return ['Do Not Call','Archive'].indexOf(c.status)>=0;}).length+
        ' excluded by status')+
      met('Saved searches',DB.savedSearches.length,'standing queries on this desk')+
    '</div>'+
    chartCards+
    '<div class="sec"><h3>Conversion by job order</h3><div class="tw"><table><thead><tr><th>Job order</th><th>Company</th>'+
      '<th class="num">On pipeline</th><th class="num">Sendouts</th><th class="num">Interviews</th><th class="num">Placed</th>'+
      '<th class="num">Sendout → interview</th><th>Coverage</th></tr></thead><tbody>'+
      DB.jobs.map(function(j){
        var g=funnel(jobSubs(j.id));
        var conv=g['Client Submission']?pct(g['Interview Scheduled'],g['Client Submission']):null;
        return '<tr class="click" data-go="job" data-id="'+j.id+'"><td><span class="lnk">'+esc(j.title)+'</span></td>'+
          '<td class="muted">'+esc(coName(j.companyId))+'</td>'+
          '<td class="num">'+g['New Lead']+'</td><td class="num">'+g['Client Submission']+'</td>'+
          '<td class="num">'+g['Interview Scheduled']+'</td><td class="num">'+g['Placed']+'</td>'+
          '<td class="num">'+(conv==null?'—':(conv<34?'<span class="pill p-bad">'+conv+'%</span>':conv+'%'))+'</td>'+
          '<td>'+covBar(j)+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<p class="muted" style="font-size:12px;margin:9px 0 0;max-width:76ch">A weak sendout-to-interview rate points at submission quality or a misread job description, not at candidate volume. Sending more of the same will not move it.</p></div>'+
    '<div class="sec grid g2">'+
      '<div class="card"><div class="card-h"><h4>Candidate source performance</h4></div>'+
        '<table><thead><tr><th>Source</th><th class="num">Candidates</th><th class="num">Sent out</th>'+
        '<th class="num">Placed</th><th class="num">Placement rate</th></tr></thead><tbody>'+
        Object.keys(src).map(function(k){
          var r=src[k];
          return '<tr><td>'+esc(k)+'</td><td class="num">'+r.n+'</td><td class="num">'+r.sent+'</td>'+
            '<td class="num">'+r.placed+'</td><td class="num">'+pct(r.placed,r.n)+'%</td></tr>';
        }).join('')+'</tbody></table></div>'+
      '<div class="card"><div class="card-h"><h4>Recorded actions this session</h4><span class="sp"></span>'+
        '<span class="muted mono">'+DB.audit.length+'</span></div><div class="card-b">'+
        (DB.audit.length?'<div class="fun">'+(function(){
          var by={};
          DB.audit.forEach(function(a){var k=a.action.split(' →')[0];by[k]=(by[k]||0)+1;});
          var keys=Object.keys(by).sort(function(a,b){return by[b]-by[a];});
          var top=by[keys[0]];
          return keys.slice(0,8).map(function(k){
            return '<div class="fun-row"><span>'+esc(k)+'</span><div class="fun-bar"><span style="width:'+
              pct(by[k],top)+'%;background:var(--sys)"></span></div><span class="r">'+by[k]+'</span></div>';
          }).join('');
        })()+'</div>':'<div class="muted" style="font-size:13px">Nothing recorded yet. Your actions appear here and in the activity log.</div>')+
      '</div></div></div>'+
    '<div class="sec"><h3>Data quality flags <em>· '+flags.length+'</em></h3>'+
      (flags.length?'<div class="tw"><table><thead><tr><th style="width:180px">Flag</th><th>Detail</th><th></th></tr></thead><tbody>'+
        flags.map(function(fl){
          var go=fl[2]==='sub'?'data-act="sub"':'data-go="'+fl[2]+'"';
          return '<tr class="click" '+go+' data-id="'+fl[3]+'"><td><span class="pill p-warn">'+esc(fl[0])+'</span></td>'+
            '<td>'+esc(fl[1])+'</td><td style="text-align:right"><span class="lnk">Fix</span></td></tr>';
        }).join('')+'</tbody></table></div>'
       :'<div class="empty"><b>No flags</b>Every live record is inside tolerance. This is the state to hand a desk over in.</div>')+'</div>';
}

function vAudit(){
  return '<div class="h"><h2>Activity Log</h2></div>'+
    '<p class="sub">Everything you have done this session, newest first. In a live system this is what an audit or a client dispute is settled with.</p>'+
    (DB.audit.length?'<div class="tw"><table><thead><tr><th style="width:150px">When</th><th style="width:250px">Action</th>'+
      '<th>Detail</th><th style="width:100px">By</th></tr></thead><tbody>'+
      DB.audit.map(function(a){
        return '<tr><td class="mono">'+esc(fmtDT(a.at))+'</td><td style="font-weight:500">'+esc(a.action)+'</td>'+
          '<td class="muted">'+esc(a.detail)+'</td><td class="muted">'+esc(a.by)+'</td></tr>';
      }).join('')+'</tbody></table></div>'
    :'<div class="empty"><b>No actions yet</b>Start the first practice task and your steps appear here.</div>');
}

function vGuide(){
  return '<div class="h"><h2>Guide</h2><span class="sp"></span><div class="btnrow">'+
    '<button class="btn ghost" data-act="tour">Take the guided tour</button>'+
    '<button class="btn ghost" data-act="session">Session summary</button>'+
    '<button class="btn" data-act="assess">Knowledge check</button></div></div>'+
    '<p class="sub">How this environment works and the rules it enforces.</p>'+

    '<div class="sec"><h3>Record types and how they connect</h3><div class="tw"><table><thead><tr>'+
      '<th style="width:150px">Record</th><th>What it is</th><th>Comes from</th></tr></thead><tbody>'+
      [['Lead','An unqualified sales enquiry. No job order, no submissions.','Inbound, referral or outbound activity'],
       ['Opportunity','A forecastable requirement, not yet released to recruit on.','Converted from a lead, or added to a company'],
       ['Company','The parent client record everything hangs off.','Converted from a lead, or added directly'],
       ['Contact','The named person who receives sendouts and gives feedback.','Added under a company'],
       ['Job Order','The unit of recruiting work. Carries type, openings and rates.','Converted from an opportunity, or added to a company'],
       ['Candidate','One record per person. Duplicates corrupt every ratio.','Sourced, applied, referred or already on file'],
       ['Submission','A candidate on a job order pipeline, with a status history.','Adding a candidate to a job order'],
       ['Appointment','An interview or meeting tied to a submission.','Moving a submission to Interview Scheduled'],
       ['Placement','An accepted candidate, pending approval then billable.','Moving a submission to Placed'],
       ['Time Entry','A week of hours against an approved placement.','Added on the placement'],
       ['Note','An activity record linked to every record it concerns.','Any record, or Add New'],
       ['Tearsheet','A saved candidate list for a recurring requirement.','Add New, then add candidates']
      ].map(function(r){
        return '<tr><td style="font-weight:600">'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td class="muted">'+esc(r[2])+'</td></tr>';
      }).join('')+'</tbody></table></div></div>'+

    '<div class="sec"><h3>Submission statuses and what each one requires</h3><div class="tw"><table><thead><tr>'+
      '<th style="width:175px">Status</th><th>Meaning</th><th>Required before you can move on</th></tr></thead><tbody>'+
      [['New Lead','On the pipeline, not yet qualified by you.','Nothing. Creating the submission is the record.'],
       ['Internal Submission','Screened by you and written up.','Screening notes of 40+ characters, confirmed availability and rate, and a client-facing summary of 60+ characters.'],
       ['Client Submission','The sendout. CV is with the named contact.','Pay and bill rate, bill above pay and within the job order rate, pay not below the confirmed expectation, a named recipient and candidate consent.'],
       ['Interview Scheduled','An appointment exists on the record.','Date not in the past, duration, format, named interviewer and confirmation the candidate was briefed.'],
       ['Offer Extended','Terms agreed with the candidate.','Final rates within the job order rate, a future start date and notes from the offer conversation.'],
       ['Placed','Accepted. A placement is created.','A remaining opening, an employment type, an end date after the start, and written confirmation from both sides.']
      ].map(function(r){
        return '<tr><td>'+subPill(r[0])+'</td><td>'+esc(r[1])+'</td><td class="muted">'+esc(r[2])+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<p class="muted" style="font-size:12px;margin:9px 0 0;max-width:76ch">Closing a submission uses Client Declined, Candidate Declined or Not Proceeding. Which one you choose is a reportable distinction: client declines point at submission quality, candidate declines point at rate or briefing.</p></div>'+

    '<div class="sec"><h3>Boolean search</h3><div class="tw"><table><thead><tr>'+
      '<th style="width:200px">Query</th><th>Matches</th></tr></thead><tbody>'+
      [['<code>nurse</code>','the whole word only. Will not find “nurses” or “nursing”.'],
       ['<code>nurs*</code>','the stem plus anything after it: nurse, nurses, nursing.'],
       ['<code>"order picker"</code>','that exact phrase, in that order. Without the quotes it is two separate AND terms.'],
       ['<code>java AND aws</code>','both terms. Two terms with no operator between them are treated as AND.'],
       ['<code>java OR python</code>','either term. Use it to widen a search that returned too little.'],
       ['<code>nurse NOT paediatric</code>','excludes the second term. <code>-paediatric</code> is the same thing.'],
       ['<code>(a OR b) AND c</code>','brackets first. Without them AND binds tighter than OR, which is the commonest boolean mistake there is.'],
       ['<code>skills:kubernetes</code>','restricts the term to one field. Fields: name, title, skills, location, status, source, category, cv, rate, availability, owner.'],
       ['<code>cv:"cycle counting"</code>','searches only the CV body, not the indexed fields.']
      ].map(function(r){
        return '<tr><td style="font-family:var(--mono);font-size:12px">'+r[0]+'</td><td class="muted">'+esc(r[1])+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<p class="muted" style="font-size:12px;margin:9px 0 0;max-width:78ch">Every search shows how it was interpreted above the results, and every result shows which terms it matched on. When a trainee gets an unexpected result set, read those two things before changing the query.</p></div>'+

    '<div class="sec grid g2">'+
      '<div class="card"><div class="card-h"><h4>CVs and searchability</h4></div><div class="card-b">'+
        '<ul style="margin:0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:7px;max-width:60ch">'+
        ['The searchable copy is the text, not the file. A CV with no extractable text cannot be found by boolean search.',
         'Plain text files are read automatically. PDF and Word files are kept by name, and the text is pasted in, because reliable extraction needs a server.',
         'At least 80 characters of text are required before a CV will save.',
         'The candidate list can be filtered by With CV or No CV, which is how you find the records that are dragging your search coverage down.'
        ].map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div></div>'+
      '<div class="card"><div class="card-h"><h4>Editing records</h4></div><div class="card-b">'+
        '<ul style="margin:0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:7px;max-width:60ch">'+
        ['Every record type has an Edit button, and every edit is written to the activity log field by field, old value to new.',
         'Editing is not a way round the rules. The same validation applies, and some edits are refused outright.',
         'Changing rates or the start date on an approved placement voids the approval and sends it back to Pending Approval.',
         'A pay rate cannot be changed once weeks have been approved at the old rate. That needs an adjustment, not an edit.',
         'Openings cannot drop below the number already placed, and a job order cannot be archived under a live requirement.',
         'Lead and opportunity statuses cannot be set to Converted or Won by hand — use the conversion actions so the records they create actually exist.'
        ].map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div></div>'+
    '</div>'+

    '<div class="sec grid g2">'+
      '<div class="card"><div class="card-h"><h4>Rules that will stop you</h4></div><div class="card-b">'+
        '<ul style="margin:0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:7px;max-width:60ch">'+
        ['Statuses move one step at a time. You cannot jump from New Lead to Client Submission.',
         'Bill rate must exceed pay rate and cannot exceed the job order bill rate.',
         'Pay rate cannot fall below the pay expectation you confirmed at screening.',
         'A candidate set to Do Not Call or Archive cannot be added to a pipeline.',
         'A candidate cannot appear twice on the same pipeline, and duplicate names are challenged on creation.',
         'A placement cannot be created once the openings on a job order are consumed.',
         'A job order cannot be set to Filled until every opening is placed.',
         'Placements start at Pending Approval, and approval is refused below 10% gross margin.',
         'Time entry is blocked while the placement is unapproved or onboarding is incomplete.',
         'Direct Hire placements have no time entry at all, because they are fee based.',
         'A note must be linked to at least one record.',
         'Closing or cancelling a job order withdraws its live candidates as Not Proceeding.',
         'Mass adding from search skips anyone already on the pipeline or set to Do Not Call, and reports who was skipped.',
         'A CV will not save without at least 80 characters of text, because an unsearchable CV is worse than none.'
        ].map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div></div>'+
      '<div class="card"><div class="card-h"><h4>Running this as a session</h4></div><div class="card-b">'+
        '<ul style="margin:0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:7px;max-width:60ch">'+
        ['Set the desk type in the practice panel before starting. 180\u00b0 finishes at the client '+
          'submission, 360\u00b0 runs to the candidate starting, and VMS carries on into placement '+
          'approval, compliance and approved hours. Every scenario shortens or lengthens to match, '+
          'so nobody practises work that is not theirs.',
         'New trainees are offered a two minute guided tour the first time they open this. It is optional, it can be skipped, and it can be replayed from this page or the panel on the right.',
         'Scenario 1 is the guided walkthrough, lead to invoice. Allow 35 to 45 minutes for a first pass.',
         'Scenario 2 is an inherited desk. It exposes judgement rather than clicks.',
         'Scenario 3 is the reporting conversation, and is the one worth observing closely.',
         'Scenario 4 is sourcing and boolean search against the 150-CV pool. Run it before scenario 1 if the cohort are sourcers rather than 360 recruiters.',
         'The knowledge check is the pass mark. Eight of twelve or better.',
         'Work is saved to a local database in the browser automatically. Use Database → Export to hand a session to a trainer.',
         'Fast Find, the left menu and the record tabs across the top are how you navigate. Trainees should use them rather than the browser back button.',
         'The practice panel collapses to a button in the bottom right corner, so the application can be seen at full width. The button shows how many steps are done, and the choice is remembered.'
        ].map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div></div>'+
    '</div>'+

    '<div class="sec"><h3>Before you use this for sign-off</h3>'+
      '<div class="callout warn" style="max-width:80ch">This is a practice build with invented records, written to mirror common staffing-platform structure and vocabulary. Field names, mandatory fields, status lists, approval routing and margin thresholds are all configurable in a real system and will differ from yours. Check this against your own configuration and SOP first, and correct anything that does not match, because teaching a status name your platform does not use is worse than teaching none.</div></div>';
}

function vSession(){
  var L=[];
  L.push('RECRUITMENT ATS — PRACTICE SESSION SUMMARY');
  L.push('Generated '+fmtDT(new Date()));
  L.push('');
  var dk=DESKS[DB.desk||'d360']||DESKS.d360;
  L.push('Desk type practised: '+dk.t+' (finishes at '+dk.ends+')');
  L.push('');
  Object.keys(SCENARIOS).forEach(function(k){
    var st=scenarioState(k);
    L.push(st.sc.name+' — '+st.done+' of '+st.total+' steps complete ('+pct(st.done,st.total)+'%)');
    st.steps.forEach(function(s,i){L.push('  ['+(st.flags[i]?'x':' ')+'] '+s.t);});
    L.push('');
  });
  L.push('Weekly desk review: '+(DB.quiz?DB.quiz.score+'/3':'not attempted'));
  L.push('Knowledge check: '+(DB.assess?DB.assess.score+'/'+DB.assess.total+
    (DB.assess.score>=8?' (pass)':' (below pass mark)'):'not attempted'));
  L.push('');
  L.push('Records created this session:');
  L.push('  Leads '+DB.leads.filter(function(x){return x.mine;}).length+
    ' · Opportunities '+DB.opps.filter(function(x){return x.mine;}).length+
    ' · Companies '+DB.companies.filter(function(x){return x.mine;}).length+
    ' · Contacts '+DB.contacts.filter(function(x){return x.mine;}).length);
  L.push('  Job orders '+DB.jobs.filter(function(x){return x.mine;}).length+
    ' · Candidates '+DB.candidates.filter(function(x){return x.mine;}).length+
    ' · Submissions '+DB.subs.filter(function(x){return x.mine;}).length+
    ' · Placements '+DB.placements.filter(function(x){return x.mine;}).length+
    ' · Tearsheets '+DB.tearsheets.filter(function(x){return x.mine;}).length+
    ' · Saved searches '+DB.savedSearches.filter(function(x){return x.mine;}).length);
  L.push('');
  L.push('Sourcing activity:');
  L.push('  Boolean searches run '+DB.audit.filter(function(a){return a.action==='Ran boolean search';}).length+
    ' · Resumes attached or parsed '+DB.audit.filter(function(a){
      return /resume file|Parsed resume/i.test(a.action);}).length+
    ' · Records edited '+DB.audit.filter(function(a){return /^Edited /.test(a.action);}).length);
  L.push('  Candidate pool '+DB.candidates.length+' records, '+
    DB.candidates.filter(function(c){return !!c.cv;}).length+' with a searchable CV');
  L.push('');
  L.push('Local database: '+(Store.available
    ?('active, last saved '+(Store.lastSaved?fmtDT(Store.lastSaved):'not yet'))
    :('unavailable — '+Store.reason)));
  L.push('');
  L.push('Actions recorded: '+DB.audit.length);
  DB.audit.slice(0,50).forEach(function(a){
    L.push('  '+fmtDT(a.at)+' — '+a.action+(a.detail?': '+a.detail:''));});
  if(DB.audit.length>50)L.push('  ... '+(DB.audit.length-50)+' more');
  var text=L.join('\n');
  var root=document.getElementById('modal-root');
  root.innerHTML='<div class="scrim" data-scrim><div class="modal wide" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>Session summary</h4><p>Copy this and send it to your trainer. For the full dataset rather than this summary, use Database → Export.</p></div>'+
    '<div class="modal-b"><textarea id="sess" readonly style="width:100%;min-height:300px;font-family:var(--mono);'+
      'font-size:11.5px;line-height:1.55;border:1px solid var(--line);border-radius:5px;padding:10px">'+esc(text)+'</textarea></div>'+
    '<div class="modal-f"><button class="btn ghost" data-close>Close</button>'+
      '<button class="btn" data-copy>Copy to clipboard</button></div></div></div>';
  root.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('click',function(){root.innerHTML='';});});
  root.querySelector('[data-copy]').addEventListener('click',function(){
    var ta=document.getElementById('sess');
    ta.select();
    var ok=false;
    try{ok=document.execCommand('copy');}catch(e){ok=false;}
    if(!ok&&navigator.clipboard){navigator.clipboard.writeText(text);ok=true;}
    toast(ok?'Copied':'Select the text and copy manually',ok?'ok':'no');
  });
  root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
    if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
}

function notFound(){return '<div class="empty"><b>Record not found</b>It may have been removed by a reset.</div>';}

/* ================================================================ guided tour */
var TOUR={i:-1,active:false};

function tourSteps(){
  var cand=DB.candidates.filter(function(c){return !!c.cv;})[0]||DB.candidates[0];
  var job=DB.jobs.filter(function(j){return jobSubs(j.id).length;})[0]||DB.jobs[0];
  return [
    {t:'A quick look round',
     b:'This is a practice copy of a staffing system. Every record in it is invented, and nothing you do here touches anything real, so you can break it freely.\n\nThe tour is nine short steps and takes about two minutes. You can leave it at any point and pick it up again later from the Guide.'},
    {t:'The menu collapses',sel:'#rail',pos:'below',
     b:'Everything is reached from this rail, grouped the way the work flows: Sales, then Recruiting, then Delivery, then Tools.\n\nThe button at the top collapses it to icons when you want the width back, and expands it again when you want the labels. It remembers which way you left it.'},
    {t:'Fast Find jumps to a record',sel:'#ff',pos:'below',
     b:'Type two or more characters and you get matching candidates, contacts, companies, job orders and tearsheets straight away.\n\nUse this rather than opening a list and scrolling. It is the fastest route to a record you already know the name of.'},
    {t:'Add New creates any record',sel:'[data-act="addnew"]',pos:'below',
     b:'This creates any record type from anywhere.\n\nOne habit worth forming early: where you can, create from the parent record instead. Adding a contact from the company record, or a candidate from the job order, fills in the link for you and is one of the commonest places new users lose data.'},
    {t:'Open records stay as tabs',sel:'#tabstrip',pos:'below',
     b:'Records you open are held here so you can move between them without losing your place. Close one with the ×.\n\nUse these and the breadcrumbs rather than the browser back button, which will take you out of the app.'},
    {t:'Boolean search',view:'search',sel:'#bs-q',pos:'below',
     b:'There are 162 candidate records here, 150 with a full CV. This is where you find them.\n\nAND, OR, NOT, brackets, "exact phrases" and wildcards all work, and you can restrict a term to one field with something like skills:aws.\n\nTwo things to notice once you run a search: it prints how it read your query, and each row shows which terms it matched on. When results surprise you, read those before changing the query.'},
    {t:'A candidate record',view:'candidate',id:function(){return cand?cand.id:null;},tab:'cv',sel:'.rtabs',pos:'below',
     b:'Each record opens on its own set of tabs. This one is showing the CV.\n\nThe searchable copy is the text, not the file, so a CV with nothing readable in it cannot be found. Edit and Upload CV are at the top right, and every edit you make is logged field by field.'},
    {t:'The job order pipeline',view:'job',id:function(){return job?job.id:null;},tab:'pipeline',sel:'.ladder',pos:'above',
     b:'Six statuses, left to right. Click a candidate card to open the submission and move it on.\n\nThe system will not let you skip a status, and each move asks for what that stage actually requires. A card turns red down the left edge when it has not moved for five days.'},
    {t:'Practice tasks',sel:'#coach',pos:'left',openCoach:true,
     b:'This is the training layer, not part of the system being taught. Pick a scenario and work down the list.\n\nCollapse it with the × and it becomes a button in the bottom right corner showing your progress, so you can see the application at full width. Click that button to bring it back.\n\nSteps tick themselves only when the underlying record is genuinely correct. Nothing can be marked complete by hand.\n\nThe chevron in its corner collapses it to a slim strip that still shows your progress, so it is out of the way without being gone.'},
    {t:'Your work is saved',view:'data',sel:'#main',pos:'below',
     b:'Everything is stored in this browser, with no account and nothing to install. It survives a refresh and a restart.\n\nIf you opened this inside a preview window it will say memory only, which is normal — download the file and open it directly and the local database switches itself on. Export here is how you hand a session to your trainer.'},
    {t:'That is the tour',
     b:'A reasonable place to start is scenario 4 if you are sourcing, or scenario 1 if you are running a full desk.\n\nThe Guide has the status rules, the boolean syntax and a knowledge check with a pass mark of eight out of twelve. You can replay this tour from there whenever you like.'}
  ];
}

function tourEnd(finished){
  TOUR.active=false;TOUR.i=-1;
  document.getElementById('tour-root').innerHTML='';
  document.removeEventListener('keydown',tourKeys);
  DB.tourSeen=true;
  log(finished?'Completed the guided tour':'Left the guided tour','');
  Store.save(true);
  renderCoach();
}
function tourKeys(e){
  if(!TOUR.active)return;
  if(e.key==='Escape'){e.preventDefault();tourEnd(false);}
  else if(e.key==='ArrowRight'){e.preventDefault();tourGo(TOUR.i+1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();tourGo(TOUR.i-1);}
}
function tourStart(){
  TOUR.active=true;
  document.addEventListener('keydown',tourKeys);
  log('Started the guided tour','');
  tourGo(0);
}
function tourGo(n){
  var steps=tourSteps();
  if(n<0)n=0;
  if(n>=steps.length){tourEnd(true);
    openInfo('Tour finished','You are set up. Pick a scenario in the panel on the right, or open the Guide for the rules and the knowledge check.','','ok');
    return;}
  TOUR.i=n;
  var st=steps[n];
  if(st.openCoach&&coachMini){coachMini=false;renderCoach();}
  var needNav=st.view&&(route.view!==st.view||(st.tab&&route.tab!==st.tab));
  if(needNav){
    var id=st.id?st.id():null;
    if(st.view!=='search'&&st.view!=='data'&&!id){tourGo(n+1);return;}
    route={view:st.view,id:id,tab:st.tab||null};
    menuOpen=false;
    if(!st.openCoach)coachOpen=false;
    render();
  }
  tourPaint();
}
function tourPaint(){
  if(!TOUR.active)return;
  var steps=tourSteps(),st=steps[TOUR.i];
  if(!st)return;
  var root=document.getElementById('tour-root');
  var el=st.sel?document.querySelector(st.sel):null;
  var r=null;
  if(el&&el.getBoundingClientRect){
    var b=el.getBoundingClientRect();
    if(b.width>4&&b.height>4)r={top:b.top,left:b.left,width:b.width,height:b.height};
  }
  var vw=window.innerWidth||1200,vh=window.innerHeight||800;
  var TW=Math.min(400,vw-32);
  var body=esc(st.b).split('\n\n').map(function(p){
    return '<p style="margin:0 0 9px">'+p.replace(/\n/g,'<br>')+'</p>';}).join('');
  var chrome='<div class="tour-card" style="width:'+TW+'px">'+
    '<div class="tour-step">Step '+(TOUR.i+1)+' of '+steps.length+'</div>'+
    '<h4>'+esc(st.t)+'</h4>'+
    '<div class="tour-body">'+body+'</div>'+
    '<div class="tour-dots">'+steps.map(function(x,i){
      return '<span class="'+(i===TOUR.i?'on':(i<TOUR.i?'past':''))+'"></span>';}).join('')+'</div>'+
    '<div class="tour-actions">'+
      '<button class="btn ghost sm" data-tour="skip">Skip the tour</button>'+
      '<span style="flex:1"></span>'+
      (TOUR.i>0?'<button class="btn ghost sm" data-tour="back">Back</button>':'')+
      '<button class="btn sm" data-tour="next">'+(TOUR.i===steps.length-1?'Finish':'Next')+'</button>'+
    '</div></div>';

  if(!r){
    root.innerHTML='<div class="tour-scrim"></div>'+
      '<div class="tour-float" style="left:'+Math.round((vw-TW)/2)+'px;top:'+
      Math.max(16,Math.round(vh*0.16))+'px">'+chrome+'</div>';
  } else {
    var pad=6;
    var hole='<div class="tour-hole" style="top:'+(r.top-pad)+'px;left:'+(r.left-pad)+'px;width:'+
      (r.width+pad*2)+'px;height:'+(r.height+pad*2)+'px"></div>';
    var top,left,pos=st.pos||'below';
    var GAP=14,est=Math.min(430,vh-40);
    if(pos==='left'&&r.left>TW+GAP+16){left=r.left-TW-GAP;top=Math.max(16,r.top);}
    else if(pos==='above'&&r.top>est*0.6){left=r.left;top=Math.max(16,r.top-GAP-est*0.6);}
    else {left=r.left;top=r.top+r.height+GAP;}
    left=Math.max(16,Math.min(left,vw-TW-16));
    if(top>vh-160)top=Math.max(16,vh-Math.min(est,vh-32)-16);
    root.innerHTML='<div class="tour-scrim"></div>'+hole+
      '<div class="tour-float" style="left:'+Math.round(left)+'px;top:'+Math.round(top)+'px">'+chrome+'</div>';
  }
  root.querySelectorAll('[data-tour]').forEach(function(b){
    b.addEventListener('click',function(){
      var k=b.getAttribute('data-tour');
      if(k==='skip')tourEnd(false);
      else if(k==='back')tourGo(TOUR.i-1);
      else tourGo(TOUR.i+1);
    });
  });
  var f=root.querySelector('[data-tour="next"]');
  if(f&&f.focus)try{f.focus();}catch(e){}
}

function tourWelcome(){
  var root=document.getElementById('modal-root');
  if(root.innerHTML.trim()){
    toast('You can start the guided tour any time from the Guide','');
    DB.tourSeen=true;Store.save(true);renderCoach();return;
  }
  root.innerHTML='<div class="scrim"><div class="modal" style="width:min(470px,100%)" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>Welcome to the practice environment</h4>'+
    '<p>A staffing system loaded with invented data. Nothing here is real and nothing you do can break anything.</p></div>'+
    '<div class="modal-b">'+
      '<p style="margin:0 0 11px;font-size:13px">There is a short guided tour of the nine things worth knowing before you start. It takes about two minutes and you can leave it at any point.</p>'+
      '<p style="margin:0;font-size:13px" class="muted">Entirely optional. If you skip it you can start the tour later from the Guide, and everything works the same either way.</p>'+
    '</div>'+
    '<div class="modal-f"><button class="btn ghost" data-welcome="skip">Skip, I will explore</button>'+
    '<button class="btn" data-welcome="go">Take the tour</button></div></div></div>';
  root.querySelectorAll('[data-welcome]').forEach(function(b){
    b.addEventListener('click',function(){
      var k=b.getAttribute('data-welcome');
      root.innerHTML='';
      if(k==='go')tourStart();
      else {
        DB.tourSeen=true;
        log('Skipped the guided tour','');
        Store.save(true);
        toast('You can start the tour any time from the Guide','');
        renderCoach();
      }
    });
  });
}

/* ================================================================ icons */
var ICONS={
 dashboard:'<rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/>',
 tasks:'<path d="M2 8.5l3 3 6-7"/><path d="M8 12.5h6"/>',
 appts:'<rect x="2" y="3" width="12" height="11" rx="1"/><path d="M2 6.5h12M5.5 3V1.5M10.5 3V1.5"/>',
 leads:'<circle cx="6" cy="5" r="2.6"/><path d="M1.6 14c.4-2.6 2.3-4 4.4-4 1 0 1.9.3 2.6.9"/><path d="M11.5 9.5v4M9.5 11.5h4"/>',
 opps:'<path d="M2 13V7M6 13V3M10 13V9M14 13V5"/>',
 companies:'<rect x="2.5" y="3" width="11" height="11"/><path d="M5.5 6h1.5M9 6h1.5M5.5 9h1.5M9 9h1.5M6.5 14v-2.5h3V14"/>',
 contacts:'<circle cx="8" cy="5.2" r="2.8"/><path d="M2.8 14c.6-3 2.7-4.6 5.2-4.6S12.6 11 13.2 14"/>',
 jobs:'<rect x="1.8" y="5" width="12.4" height="8.5" rx="1"/><path d="M6 5V3.2h4V5M1.8 8.6h12.4"/>',
 candidates:'<circle cx="6" cy="5" r="2.5"/><path d="M1.5 13.6c.5-2.6 2.3-4.1 4.5-4.1s4 1.5 4.5 4.1"/><path d="M11 3.2a2.5 2.5 0 010 4.6M12.4 13.6c-.2-1.3-.6-2.4-1.3-3.2"/>',
 search:'<circle cx="7" cy="7" r="4.4"/><path d="M10.4 10.4L14 14"/>',
 pipeline:'<path d="M1.8 3h12.4l-4.6 5.2V14L6.4 12V8.2z"/>',
 tearsheets:'<path d="M3 2.6h10v10.8H3z"/><path d="M5.4 5.6h5.2M5.4 8h5.2M5.4 10.4h3"/>',
 placements:'<circle cx="8" cy="6" r="3.4"/><path d="M5.4 9.2L4 14.2l4-1.8 4 1.8-1.4-5"/>',
 approvals:'<circle cx="8" cy="8" r="5.8"/><path d="M8 4.8V8l2.4 1.6"/>',
 reports:'<path d="M2 14h12"/><rect x="3" y="8" width="2.6" height="4"/><rect x="6.9" y="5" width="2.6" height="7"/><rect x="10.8" y="9.5" width="2.6" height="2.5"/>',
 data:'<ellipse cx="8" cy="4" rx="5.4" ry="2.2"/><path d="M2.6 4v8c0 1.2 2.4 2.2 5.4 2.2s5.4-1 5.4-2.2V4"/><path d="M2.6 8.2c0 1.2 2.4 2.2 5.4 2.2s5.4-1 5.4-2.2"/>',
 notes:'<path d="M3.4 2.4h9.2v11.2H3.4z"/><path d="M5.6 5.4h4.8M5.6 7.8h4.8M5.6 10.2h2.8"/>',
 audit:'<circle cx="8" cy="8" r="5.8"/><path d="M8 4.6V8l2.6 1.4"/><path d="M2.6 3.2L4 4.6"/>',
 guide:'<path d="M2.6 3.2h4.2c.7 0 1.2.5 1.2 1.2v9c0-.7-.5-1.2-1.2-1.2H2.6z"/><path d="M13.4 3.2H9.2c-.7 0-1.2.5-1.2 1.2v9c0-.7.5-1.2 1.2-1.2h4.2z"/>'
};
function icon(k){
  return '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" '+
    'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
    (ICONS[k]||ICONS.dashboard)+'</svg>';
}

/* ================================================================ left rail */
var PINNED=[
  {v:'dashboard',t:'Home'},
  {v:'candidates',t:'Candidates'},
  {v:'jobs',t:'Jobs'},
  {v:'pipeline',t:'Submissions'},
  {v:'companies',t:'Companies'},
  {v:'contacts',t:'Contacts'},
  {v:'placements',t:'Placements'},
  {v:'tasks',t:'Tasks'},
  {v:'tearsheets',t:'Tearsheets'},
  {v:'reports',t:'Reports'}
];
var PIN_COUNT={
  candidates:function(){return DB.candidates.length;},
  jobs:function(){return openJobs().length;},
  pipeline:function(){return liveSubs().length;},
  tasks:function(){return DB.tasks.filter(function(t){return !t.done;}).length;},
  placements:function(){return DB.placements.length;},
  tearsheets:function(){return DB.tearsheets.length;}
};
var PIN_FLAG={
  placements:function(){return pendingPlacements().length;},
  pipeline:function(){return staleSubs().length;}
};
var NAV_GROUPS=['My desk','Sales','Records','Recruiting','Delivery','Tools'];
function navGroupOf(v){
  var g='Records';
  if(['dashboard','tasks','appts'].indexOf(v)>=0)g='My desk';
  else if(['leads','opps'].indexOf(v)>=0)g='Sales';
  else if(['pipeline','search','tearsheets'].indexOf(v)>=0)g='Recruiting';
  else if(['placements','approvals'].indexOf(v)>=0)g='Delivery';
  else if(['reports','audit','notes','data','config','guide'].indexOf(v)>=0)g='Tools';
  return g;
}
function navItems(){
  var byV={};
  MENU.forEach(function(i){if(i.v)byV[i.v]=i;});
  var order=(DB.config&&DB.config.navOrder)||[];
  var out=[];
  order.forEach(function(v){if(byV[v]){out.push(byV[v]);delete byV[v];}});
  Object.keys(byV).forEach(function(v){out.push(byV[v]);});
  return out;
}
function renderRail(){
  var el=document.getElementById('rail');
  el.className='side'+(railMini?' mini':'');
  var legacy=DB.uiMode==='legacy';
  el.setAttribute('aria-label',legacy?'Open records and lists':'Navigation');

  if(legacy){
    /* The legacy interface: navigation hangs off a Menu flyout, and the left column carries the
       records the user has open. This is what the reference screenshots show. */
    var out='<button class="side-menu" data-act="menu" aria-label="Open the main menu" '+
      'aria-expanded="'+(!!menuOpen)+'"><span class="bars"><i></i><i></i><i></i></span>'+
      (railMini?'':'<span class="lbl">Menu</span>')+'</button><div class="side-pins">';
    PINNED.forEach(function(l){
      var on=route.view===l.v||RAIL_ALIAS[route.view]===l.v;
      var fl=PIN_FLAG[l.v]?PIN_FLAG[l.v]():0;
      var ct=PIN_COUNT[l.v]?PIN_COUNT[l.v]():null;
      out+='<a class="side-pin'+(on?' on':'')+'" data-go="'+l.v+'" role="button" tabindex="0" '+
        'title="'+esc(l.t)+'" aria-current="'+(on?'page':'false')+'">'+
        '<span class="ic">'+icon(l.v)+(railMini&&fl?'<span class="dot"></span>':'')+'</span>'+
        (railMini?'':'<span class="lbl">'+esc(l.t)+'</span>'+
          (fl?'<span class="fl">'+fl+'</span>':(ct!=null?'<span class="ct">'+ct+'</span>':'')))+'</a>';
    });
    out+='</div><button class="side-collapse" data-act="rail">'+
      (railMini?'\u203A':'\u2039 Collapse')+'</button><div class="side-tabs">'+
      (openTabs.length&&!railMini?'<div class="side-grp">Open records</div>':'');
    openTabs.forEach(function(t){
      var on=route.id===t.id;
      out+='<div class="side-tab'+(on?' on':'')+'" data-tabopen="'+esc(t.type)+'" data-id="'+esc(t.id)+
        '" role="button" tabindex="0" title="'+esc((TAB_TYPE[t.type]||t.type)+' \u2014 '+t.label)+'">'+
        '<span class="lbl">'+esc(t.label)+'</span>'+
        '<span class="x" data-tabclose="'+esc(t.id)+'" role="button" tabindex="0" aria-label="Close tab">\u00d7</span></div>';
    });
    out+='</div><div class="side-drop" data-act="parse" role="button" tabindex="0">Drop to Parse<br>(or Click)</div>'+
      '<div class="side-foot"><button data-act="closetabs">Close All Tabs</button></div>';
    el.innerHTML=out;
    return;
  }

  /* The redesigned interface: a permanent sidebar carrying all navigation, with Fast Find and
     Preferences in it. Open records are not shown here, because that is not documented. */
  var o='<div class="side-pins">';
  var items=navItems();
  NAV_GROUPS.forEach(function(g){
    var inGroup=items.filter(function(i){return navGroupOf(i.v)===g;});
    if(!inGroup.length)return;
    o+=railMini?'<div class="side-sep"></div>':'<div class="side-grp">'+esc(g)+'</div>';
    inGroup.forEach(function(i){
      var on=route.view===i.v||RAIL_ALIAS[route.view]===i.v;
      var fl=i.fl?i.fl():0,ct=i.ct?i.ct():null;
      o+='<a class="side-pin'+(on?' on':'')+'" data-go="'+i.v+'" role="button" tabindex="0" '+
        'title="'+esc(i.t)+(fl?' \u2014 '+fl+' need attention':'')+'" aria-current="'+(on?'page':'false')+'">'+
        '<span class="ic">'+icon(i.v)+(railMini&&fl?'<span class="dot"></span>':'')+'</span>'+
        (railMini?'':'<span class="lbl">'+esc(i.t)+'</span>'+
          (fl?'<span class="fl">'+fl+'</span>':(ct!=null?'<span class="ct">'+ct+'</span>':'')))+'</a>';
    });
  });
  o+='</div><div class="side-sep"></div><div class="side-pins">'+
    '<a class="side-pin" data-act="focus-find" role="button" tabindex="0" title="Fast Find">'+
      '<span class="ic">'+icon('search')+'</span>'+(railMini?'':'<span class="lbl">Fast Find</span>')+'</a>'+
    '<a class="side-pin" data-go="config" role="button" tabindex="0" title="Preferences">'+
      '<span class="ic">'+icon('config')+'</span>'+(railMini?'':'<span class="lbl">Preferences</span>')+'</a>'+
    '</div>'+
    '<button class="side-collapse" data-act="rail" title="'+(railMini?'Show labels':'Collapse')+'">'+
      (railMini?'\u203A':'\u2039 Collapse')+'</button>';
  el.innerHTML=o;
}
function renderMenu(){
  var root=document.getElementById('fly-root');
  if(!root)return;
  if(DB.uiMode!=='legacy'||!menuOpen){root.innerHTML='';return;}
  var out='<div class="mfly-scrim" data-menuclose></div><nav class="mfly" aria-label="Main menu">'+
    '<div class="mfly-h"><span class="bars" style="display:flex;flex-direction:column;gap:3px">'+
    '<i style="display:block;width:13px;height:1.6px;background:#fff"></i>'+
    '<i style="display:block;width:13px;height:1.6px;background:#fff"></i>'+
    '<i style="display:block;width:13px;height:1.6px;background:#fff"></i></span>Menu'+
    '<span class="sp"></span><button data-menuclose aria-label="Close the menu">\u00d7</button></div>';
  MENU.forEach(function(i){
    if(i.g){out+='<div class="mfly-grp">'+esc(i.g)+'</div>';return;}
    var on=route.view===i.v||RAIL_ALIAS[route.view]===i.v;
    var fl=i.fl?i.fl():0,ct=i.ct?i.ct():null;
    out+='<a role="button" tabindex="0" class="'+(on?'on':'')+'" data-go="'+i.v+'">'+esc(i.t)+
      (fl?'<span class="fl">'+fl+'</span>':(ct!=null?'<span class="ct">'+ct+'</span>':''))+'</a>';
  });
  out+='</nav>';
  root.innerHTML=out;
  root.querySelectorAll('[data-menuclose]').forEach(function(b){
    b.addEventListener('click',function(){menuOpen=false;renderMenu();});
  });
}
var RAIL_ALIAS={company:'companies',contact:'contacts',candidate:'candidates',job:'jobs',
  placement:'placements',tearsheet:'tearsheets',lead:'leads',opp:'opps'};

/* ================================================================ sorting */
var SORT={cand:{k:'name',d:1},job:{k:'added',d:-1}};
var SORT_GET={
  cand:{name:function(c){return c.name;},occupation:function(c){return c.occupation;},
    category:function(c){return c.category;},status:function(c){return CD_STATUS.indexOf(c.status);},
    location:function(c){return c.location;},availability:function(c){return c.availability;},
    desiredRate:function(c){return c.desiredRate;},cv:function(c){return c.cv?1:0;},
    subs:function(c){return candSubs(c.id).length;}},
  job:{title:function(j){return j.title;},company:function(j){return coName(j.companyId);},
    type:function(j){return j.type;},status:function(j){return JO_STATUS.indexOf(j.status);},
    cover:function(j){return j.openings?j.filled/j.openings:0;},
    pipe:function(j){return jobSubs(j.id).filter(function(s){return PIPE_OUT.indexOf(s.status)<0;}).length;},
    billRate:function(j){return j.billRate;},added:function(j){return j.added;}}
};
function sortRows(rows,list){
  var st=SORT[list],get=(SORT_GET[list]||{})[st.k];
  if(!get)return rows;
  return rows.slice().sort(function(a,b){
    var x=get(a),y=get(b);
    if(typeof x==='string'&&typeof y==='string'){
      x=x.toLowerCase();y=y.toLowerCase();
      return x<y?-st.d:(x>y?st.d:0);
    }
    return (x-y)*st.d;
  });
}
function sortTh(list,key,label,cls){
  var st=SORT[list],on=st.k===key;
  return '<th'+(cls?' class="'+cls+'"':'')+' data-act="sort" data-list="'+list+'" data-key="'+key+
    '" style="cursor:pointer;user-select:none" title="Sort by '+esc(label)+'"'+
    (on?' aria-sort="'+(st.d>0?'ascending':'descending')+'"':'')+'>'+esc(label)+
    '<span style="color:'+(on?'var(--sys)':'var(--line)')+';margin-left:3px">'+
    (on?(st.d>0?'\u25B2':'\u25BC'):'\u25B4')+'</span></th>';
}
A.sort=function(list,key){
  var st=SORT[list];
  if(!st)return;
  if(st.k===key)st.d=-st.d;else{st.k=key;st.d=1;}
  render();
};

/* ================================================================ mass update */
A.massUpdate=function(){
  var ids=A.selectedIds();
  if(!ids.length){toast('Select some candidates first','no');return;}
  openForm({title:'Mass update '+ids.length+' candidate(s)',
    intro:'One change applied to every selected record. Powerful and hard to undo, so the log records it as a single action with a count. Leave a field on "no change" to leave it alone.',
    fields:[
      {k:'status',label:'Status',type:'select',required:true,
        options:['— no change —'].concat(CD_STATUS),
        hint:'Setting Do Not Call or Archive on a batch removes all of them from sourcing at once.'},
      {k:'owner',label:'Owner',type:'select',required:true,
        options:['— no change —','A. Trainee','A. Rao','M. Silva']},
      {k:'availability',label:'Availability',type:'select',required:true,
        options:['— no change —','Immediate','1 week','2 weeks','4 weeks','Notice period']},
      {k:'reason',label:'Reason for the change',type:'textarea',required:true,min:20,
        hint:'A batch change with no reason recorded is indistinguishable from a mistake.'},
      {k:'ack',label:'I have checked the selection before applying this',type:'check',required:true}
    ],
    validate:function(v){
      var e={};
      var none='— no change —';
      if(v.status===none&&v.owner===none&&v.availability===none)
        e.status='Nothing would change. Set at least one field.';
      if(['Do Not Call','Archive'].indexOf(v.status)>=0){
        var live=ids.filter(function(id){
          return DB.subs.some(function(s){
            return s.candidateId===id&&PIPE_OUT.indexOf(s.status)<0&&s.status!=='Placed';});});
        if(live.length)e.status=live.length+' of the selected candidates are live on a pipeline. '+
          'Setting '+v.status+' would strand those submissions. Close them first.';
      }
      return e;
    },
    submit:'Apply to '+ids.length+' record(s)',
    onSubmit:function(v){
      var none='— no change —',n=0,ch=[];
      if(v.status!==none)ch.push('status → '+v.status);
      if(v.owner!==none)ch.push('owner → '+v.owner);
      if(v.availability!==none)ch.push('availability → '+v.availability);
      ids.forEach(function(id){
        var c=byId(DB.candidates,id);
        if(!c)return;
        if(v.status!==none)c.status=v.status;
        if(v.owner!==none)c.owner=v.owner;
        if(v.availability!==none)c.availability=v.availability;
        n++;
      });
      log('Mass update',n+' candidate(s): '+ch.join(', ')+' — '+v.reason);
      toast(n+' records updated','ok');
      searchSel={};render();
    }});
};

/* ================================================================ match candidates to a job order */
var STOPWORDS=['and','the','for','with','a','an','of','to','in','on','senior','junior','lead','ii','iii'];
function jobQuery(j){
  var words=String(j.title||'').toLowerCase().replace(/[^a-z0-9 +#-]/g,' ').split(/\s+/)
    .filter(function(w){return w.length>2&&STOPWORDS.indexOf(w)<0;});
  var terms=words.slice(0,3).map(function(w){return w+'*';});
  var q=terms.length>1?'('+terms.join(' OR ')+')':(terms[0]||'');
  if(j.category)q+=(q?' AND ':'')+'category:"'+j.category+'"';
  q+=' NOT status:"do not call"';
  return q;
}
A.matchJob=function(id){
  var j=byId(DB.jobs,id);
  if(!j)return;
  var q=jobQuery(j);
  openForm({title:'Find candidates for this job order',
    intro:'A starting query is built from the role title and the category, with Do Not Call excluded. It is a first pass, not an answer — widen it with OR, or tighten it with the skills the client actually cares about.',
    note:j.title+' · '+coName(j.companyId)+' · '+j.category,
    fields:[{k:'q',label:'Query',type:'text',required:true,value:q,
      hint:'Runs against every candidate field and the full CV text.'}],
    submit:'Run search',
    onSubmit:function(v){
      log('Searched from job order',j.title);
      route={view:'search',id:null,tab:null};
      A.runSearch(v.q);
    }});
};

/* ================================================================ notifications */
function notify(text,view,id){
  if(!DB.notifs)DB.notifs=[];
  DB.notifs.unshift({id:uid('NF'),text:text,view:view||null,rid:id||null,
    at:new Date().toISOString(),read:false});
  if(DB.notifs.length>60)DB.notifs.length=60;
}
function unread(){return (DB.notifs||[]).filter(function(n){return !n.read;}).length;}
A.notifs=function(){
  var list=DB.notifs||[];
  var root=document.getElementById('modal-root');
  root.innerHTML='<div class="scrim" data-scrim><div class="modal" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>Notifications</h4><p>'+list.length+' recent, '+unread()+' unread</p></div>'+
    '<div class="modal-b" style="padding:0">'+
    (list.length?list.slice(0,25).map(function(n){
      return '<div style="padding:10px 15px;border-bottom:1px solid var(--line2);display:flex;gap:9px;'+
        'align-items:flex-start;'+(n.read?'':'background:var(--blue-sf);')+'">'+
        '<span style="width:7px;height:7px;border-radius:50%;background:'+(n.read?'var(--line)':'var(--blue)')+
        ';margin-top:5px;flex:none"></span><div style="flex:1"><div style="font-size:13px">'+esc(n.text)+'</div>'+
        '<div class="muted" style="font-size:11.5px">'+esc(ago(n.at))+'</div></div>'+
        (n.view?'<span class="lnk" data-notifgo="'+n.view+'" data-notifid="'+esc(n.rid||'')+'" '+
          'role="button" tabindex="0" style="font-size:12px">Open</span>':'')+'</div>';
    }).join(''):'<div class="empty" style="padding:26px"><b>Nothing yet</b>Interviews, submissions, placements and overdue tasks appear here.</div>')+
    '</div><div class="modal-f"><button class="btn ghost" data-close>Close</button>'+
    (unread()?'<button class="btn" data-readall>Mark all read</button>':'')+'</div></div></div>';
  root.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('click',function(){root.innerHTML='';render();});});
  var ra=root.querySelector('[data-readall]');
  if(ra)ra.addEventListener('click',function(){
    (DB.notifs||[]).forEach(function(n){n.read=true;});root.innerHTML='';render();});
  root.querySelectorAll('[data-notifgo]').forEach(function(b){
    b.addEventListener('click',function(){
      var v=b.getAttribute('data-notifgo'),i=b.getAttribute('data-notifid');
      (DB.notifs||[]).forEach(function(n){if(n.view===v&&n.rid===i)n.read=true;});
      root.innerHTML='';go(v,i||null);});
  });
  root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
    if(e.target===root.querySelector('[data-scrim]')){root.innerHTML='';render();}});
};

/* ================================================================ email */
var EMAIL_TEMPLATES=[
 {k:'blank',t:'— no template —',s:'',b:''},
 {k:'intro',t:'Candidate introduction',
  s:'Introducing {candidate} for {job}',
  b:'Hi {contact},\n\nI have {candidate} available for the {job} role at {company}.\n\n'+
    '{candidate} is currently working as {occupation} in {location}, is available {availability}, '+
    'and is looking for {rate} per hour.\n\nSummary:\n{summary}\n\n'+
    'I have confirmed availability and rate directly. Happy to arrange a call this week.\n\n'+
    'Kind regards,\n{recruiter}'},
 {k:'sendout',t:'Submission to client',
  s:'CV attached — {candidate} for {job}',
  b:'Hi {contact},\n\nPlease find attached the CV for {candidate} for the {job} position.\n\n'+
    'Why I am putting them forward:\n{summary}\n\nRate: {rate} per hour\nAvailability: {availability}\n\n'+
    'Could you let me know by end of week whether you would like to interview?\n\n'+
    'Kind regards,\n{recruiter}'},
 {k:'confirm',t:'Interview confirmation',
  s:'Interview confirmed — {job}',
  b:'Hi {candidate},\n\nYour interview for {job} at {company} is confirmed.\n\n'+
    'When: {interview}\nFormat: {mode}\nInterviewer: {interviewer}\n\n'+
    'Please arrive ten minutes early and bring photo identification. Reply to confirm you have this.\n\n'+
    'Kind regards,\n{recruiter}'},
 {k:'remind',t:'Interview reminder',
  s:'Reminder — interview for {job}',
  b:'Hi {candidate},\n\nA quick reminder about your interview for {job} at {company}.\n\n'+
    'When: {interview}\nFormat: {mode}\nInterviewer: {interviewer}\n\n'+
    'Call me straight away if anything has changed.\n\nKind regards,\n{recruiter}'},
 {k:'avail',t:'Availability check',
  s:'Are you still available?',
  b:'Hi {candidate},\n\nI am updating our records. Are you still available {availability}, '+
    'and is {rate} per hour still what you are looking for?\n\n'+
    'A one line reply is fine and it keeps you in the running for roles as they come in.\n\n'+
    'Kind regards,\n{recruiter}'},
 {k:'followup',t:'Client follow-up',
  s:'Following up — {job}',
  b:'Hi {contact},\n\nFollowing up on the CV I sent for {job}.\n\n'+
    'Do you have any feedback yet? If the profile is not right I would rather know now so I can adjust '+
    'what I am sending you.\n\nKind regards,\n{recruiter}'},
 {k:'reject',t:'Candidate rejection',
  s:'Update on your application — {job}',
  b:'Hi {candidate},\n\nThank you for your time on the {job} role at {company}.\n\n'+
    'On this occasion the client has decided not to progress. The feedback was:\n\n{reason}\n\n'+
    'I would like to keep you on file for similar roles, and I will come back to you when one lands.\n\n'+
    'Kind regards,\n{recruiter}'}
];

function emailContext(ctx){
  var c=ctx.candidateId?byId(DB.candidates,ctx.candidateId):null;
  var j=ctx.jobId?byId(DB.jobs,ctx.jobId):null;
  var s=ctx.subId?byId(DB.subs,ctx.subId):null;
  if(s&&!c)c=byId(DB.candidates,s.candidateId);
  if(s&&!j)j=byId(DB.jobs,s.jobId);
  var t=ctx.contactId?byId(DB.contacts,ctx.contactId):(j?byId(DB.contacts,j.contactId):null);
  var co=j?byId(DB.companies,j.companyId):(t?byId(DB.companies,t.companyId):null);
  var ap=s&&s.apptId?byId(DB.appts,s.apptId):null;
  return {
    candidate:c?c.name:'', occupation:c?c.occupation:'', location:c?c.location:'',
    availability:c?c.availability:'', rate:s&&s.payRate?money(s.payRate):(c?money(c.desiredRate):''),
    job:j?j.title:'', company:co?co.name:'', contact:t?t.name:'',
    summary:s&&s.summary?s.summary:(c&&c.cv?'See attached CV.':''),
    interview:ap?fmtDT(ap.at):'', mode:ap?ap.location:'', interviewer:ap?ap.attendees:'',
    reason:s&&s.reason?s.reason:'', recruiter:'A. Trainee',
    _c:c,_j:j,_t:t,_co:co,_s:s
  };
}
function fillTpl(str,v){
  return String(str||'').replace(/\{(\w+)\}/g,function(m,k){
    return v[k]!=null&&v[k]!==''?v[k]:'['+k+']';});
}
A.email=function(ctx){
  ctx=ctx||{};
  var v=emailContext(ctx);
  var toCandidate=ctx.to==='candidate';
  var toName=toCandidate?v.candidate:v.contact;
  var toAddr=toCandidate?(v._c?v._c.email:''):(v._t?v._t.email:'');
  if(!toAddr){toast('No email address on that record','no');return;}
  var tplKey=ctx.template||(toCandidate?'avail':'sendout');
  var root=document.getElementById('modal-root');

  function draw(){
    var tpl=EMAIL_TEMPLATES.filter(function(x){return x.k===tplKey;})[0]||EMAIL_TEMPLATES[0];
    var subj=fillTpl(tpl.s,v),body=fillTpl(tpl.b,v);
    root.innerHTML='<div class="scrim" data-scrim><div class="modal wide" role="dialog" aria-modal="true">'+
      '<div class="modal-h"><h4>New email</h4><p>To '+esc(toName)+
        (v._co&&!toCandidate?' at '+esc(v._co.name):'')+'</p></div>'+
      '<div class="modal-b">'+
        (DB.training!==false?'<div class="callout">Nothing is actually sent. The message is recorded as an Email activity on every record it concerns, which is what makes the history usable later.</div>':'')+
        '<div class="f"><label for="em-tpl">Template</label><select id="em-tpl">'+
          EMAIL_TEMPLATES.map(function(x){
            return '<option value="'+x.k+'"'+(x.k===tplKey?' selected':'')+'>'+esc(x.t)+'</option>';
          }).join('')+'</select>'+
          '<div class="hint">Changing the template rewrites the subject and body from the record. Edit afterwards.</div></div>'+
        '<div class="f"><label for="em-to">To <span>required</span></label>'+
          '<input type="text" id="em-to" value="'+esc(toAddr)+'"></div>'+
        '<div class="f"><label for="em-cc">CC</label><input type="text" id="em-cc" value=""></div>'+
        '<div class="f"><label for="em-subj">Subject <span>required</span></label>'+
          '<input type="text" id="em-subj" value="'+esc(subj)+'"></div>'+
        '<div class="f"><label for="em-body">Message <span>required</span></label>'+
          '<textarea id="em-body" style="min-height:230px">'+esc(body)+'</textarea></div>'+
        (v._c&&v._c.cv?'<div class="f cb"><input type="checkbox" id="em-cv"'+
          (tplKey==='sendout'||tplKey==='intro'?' checked':'')+'>'+
          '<div><label for="em-cv">Attach the CV for '+esc(v.candidate)+'</label>'+
          '<div class="hint">'+esc(v._c.cvName||'CV on file')+'</div></div></div>':
          (v._c?'<div class="callout warn">'+esc(v.candidate)+' has no CV on file, so nothing can be attached.</div>':''))+
        '<div class="err" id="em-err" style="display:none"></div>'+
      '</div>'+
      '<div class="modal-f"><button class="btn ghost" data-close>Cancel</button>'+
        '<button class="btn" data-send>Send</button></div></div></div>';

    document.getElementById('em-tpl').addEventListener('change',function(e){
      tplKey=e.target.value;draw();});
    root.querySelectorAll('[data-close]').forEach(function(b){
      b.addEventListener('click',function(){root.innerHTML='';});});
    root.querySelector('[data-send]').addEventListener('click',send);
    root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
      if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
  }
  function send(){
    var to=document.getElementById('em-to').value.trim();
    var cc=document.getElementById('em-cc').value.trim();
    var subj=document.getElementById('em-subj').value.trim();
    var body=document.getElementById('em-body').value.trim();
    var cvBox=document.getElementById('em-cv');
    var err=document.getElementById('em-err');
    function bad(m){err.style.display='block';err.textContent=m;}
    if(to.indexOf('@')<0)return bad('The To address is not a full email address.');
    if(!subj)return bad('A subject is required. An email with no subject is the one the client never opens.');
    if(body.length<40)return bad('The message needs at least 40 characters. Currently '+body.length+'.');
    if(/\[\w+\]/.test(subj+' '+body))
      return bad('There are unfilled placeholders still in the message, for example '+
        (subj+' '+body).match(/\[\w+\]/)[0]+'. Fill them in or remove them before sending.');
    var links={};
    if(v._c)links.candidateId=v._c.id;
    if(v._t)links.contactId=v._t.id;
    if(v._co)links.companyId=v._co.id;
    if(v._j)links.jobId=v._j.id;
    DB.notes.push({id:uid('NT'),action:'Email',
      text:'Email to '+to+' — '+subj+(cvBox&&cvBox.checked?' (CV attached)':'')+'\n\n'+body,
      at:new Date().toISOString(),by:'A. Trainee',links:links,mine:true,
      email:{to:to,cc:cc,subject:subj,attached:!!(cvBox&&cvBox.checked)}});
    log('Sent email','to '+to+' — '+subj);
    notify('Email sent to '+(toName||to)+': '+subj,
      v._c?'candidate':(v._j?'job':null),v._c?v._c.id:(v._j?v._j.id:null));
    root.innerHTML='';
    toast('Email sent and logged as an activity','ok');
    render();
  }
  draw();
};

/* ================================================================ files + resume parsing
   Per the documentation: a file being attached is not the same as the record being
   updated. Updating happens through Files -> the resume -> Actions -> Parse as Existing,
   which previews current against proposed values and lets each field be deselected.
   parserOverwritePrevention protects populated fields and appends to the list fields. */

function fileList(c){ if(!c.files)c.files=[]; return c.files; }
function resumeFile(c){
  return fileList(c).filter(function(f){return f.isResume;})
    .sort(function(a,b){return new Date(b.at)-new Date(a.at);})[0]||null;
}
function addFile(c,name,type,isResume,text){
  var f={id:uid('FL'),name:name,type:type||'Resume',isResume:!!isResume,
    at:new Date().toISOString(),by:'A. Trainee',text:text||''};
  fileList(c).unshift(f);
  return f;
}

/* --- a deliberately simple parser, matched to the CV shape used in this sandbox --- */
function parseCV(text){
  var out={};
  var lines=String(text||'').split('\n');
  var head=(lines[1]||'').split('|').map(function(x){return x.trim();});
  if(head.length>=2){
    if(head[0])out.occupation=head[0];
    if(head[1])out.location=head[1];
  }
  head.forEach(function(x){
    if(x.indexOf('@')>0)out.email=x;
    else if(/^\+?[\d\s()-]{7,}$/.test(x))out.phone=x;
  });
  function section(name){
    var i=-1;
    for(var k=0;k<lines.length;k++)
      if(lines[k].trim().toUpperCase()===name){i=k;break;}
    if(i<0)return '';
    var buf=[];
    for(var j=i+1;j<lines.length;j++){
      var L=lines[j];
      if(/^[A-Z][A-Z &]+$/.test(L.trim())&&L.trim().length>3)break;
      if(L.trim())buf.push(L.trim());
    }
    return buf.join(' ');
  }
  var sk=section('KEY SKILLS');
  if(sk)out.skills=sk.split(',').map(function(x){return x.trim();}).filter(Boolean);
  var ce=section('CERTIFICATIONS');
  if(ce)out.certs=ce.split(',').map(function(x){return x.trim();}).filter(Boolean);
  var yrs=/(\d+)\s+years/.exec(section('PROFESSIONAL SUMMARY'));
  if(yrs)out.years=Number(yrs[1]);
  return out;
}

var PARSE_FIELDS=[
  {k:'occupation',label:'Occupation'},
  {k:'location',label:'Address'},
  {k:'email',label:'Email 1'},
  {k:'phone',label:'Mobile Phone'},
  {k:'years',label:'Years of Experience'},
  {k:'skills',label:'Primary Skills',list:true},
  {k:'certs',label:'Certifications',list:true}
];

A.parseExisting=function(candId,fileId){
  var c=byId(DB.candidates,candId);
  if(!c)return;
  var f=fileList(c).filter(function(x){return x.id===fileId;})[0];
  var text=(f&&f.text)||c.cv;
  if(!text){toast('That file has no readable text to parse','no');return;}
  var pr=parseCV(text);
  var prevent=DB.parserOverwritePrevention===true;

  var rows=PARSE_FIELDS.map(function(fd){
    var cur=fd.list?(c[fd.k]||[]).join(', '):(c[fd.k]==null?'':String(c[fd.k]));
    var pro=fd.list?(pr[fd.k]||[]).join(', '):(pr[fd.k]==null?'':String(pr[fd.k]));
    if(!pro)return null;
    var same=cur.trim().toLowerCase()===pro.trim().toLowerCase();
    /* Overwrite prevention: populated fields are protected, list fields append. */
    var blocked=prevent&&cur&&!fd.list;
    return {fd:fd,cur:cur,pro:pro,same:same,blocked:blocked,
      on:!same&&!blocked};
  }).filter(Boolean);

  if(!rows.length){
    openInfo('Nothing to update','The parser did not find anything in this file that differs from the record.','','warn');
    return;
  }
  var sel={};
  rows.forEach(function(r,i){sel[i]=r.on;});
  var root=document.getElementById('modal-root');

  function draw(){
    root.innerHTML='<div class="scrim" data-scrim><div class="modal wide" role="dialog" aria-modal="true">'+
      '<div class="modal-h"><h4>Parse as Existing</h4><p>'+esc(c.name)+' \u00b7 '+
        esc((f&&f.name)||'resume')+'</p></div>'+
      '<div class="modal-b">'+
        (DB.training!==false?'<div class="callout">Attaching a file does not change the record. This screen '+
          'is where the record gets updated: review each field, clear anything you do not want taken from '+
          'the CV, and only the ticked rows are written.</div>':'')+
        (prevent?'<div class="callout warn"><b>Overwrite prevention is on.</b> Fields that already hold a '+
          'value are protected and shown greyed. Skills and certifications append rather than replace.</div>':'')+
        '<div class="tw"><table><thead><tr><th style="width:34px"></th><th>Field</th>'+
        '<th>Current value</th><th>From the CV</th></tr></thead><tbody>'+
        rows.map(function(r,i){
          return '<tr'+(r.blocked?' class="muted"':'')+'>'+
            '<td>'+(r.blocked?'<span class="muted" title="Protected by overwrite prevention">\u2014</span>'
              :'<span class="selbox'+(sel[i]?' on':'')+'" data-prow="'+i+'" role="checkbox" '+
               'tabindex="0" aria-checked="'+(!!sel[i])+'">'+(sel[i]?'\u2713':'')+'</span>')+'</td>'+
            '<td style="font-weight:600">'+esc(r.fd.label)+'</td>'+
            '<td class="muted" style="max-width:26ch;overflow-wrap:anywhere">'+
              (r.cur?esc(r.cur):'<i>empty</i>')+'</td>'+
            '<td style="max-width:26ch;overflow-wrap:anywhere">'+esc(r.pro)+
              (r.same?' <span class="pill p-flat">no change</span>':'')+
              (r.blocked?' <span class="pill p-warn">protected</span>':'')+
              (prevent&&r.fd.list&&r.cur?' <span class="pill p-open">will append</span>':'')+'</td></tr>';
        }).join('')+'</tbody></table></div>'+
      '</div>'+
      '<div class="modal-f"><button class="btn ghost" data-close>Cancel</button>'+
        '<button class="btn ghost" data-none>Clear all</button>'+
        '<button class="btn" data-save>Update the record</button></div></div></div>';

    root.querySelectorAll('[data-prow]').forEach(function(b){
      b.addEventListener('click',function(){
        var i=Number(b.getAttribute('data-prow'));sel[i]=!sel[i];draw();});
    });
    root.querySelectorAll('[data-close]').forEach(function(b){
      b.addEventListener('click',function(){root.innerHTML='';});});
    root.querySelector('[data-none]').addEventListener('click',function(){
      rows.forEach(function(r,i){sel[i]=false;});draw();});
    root.querySelector('[data-save]').addEventListener('click',save);
    root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
      if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
    focusable(root);
  }
  function save(){
    var applied=[];
    rows.forEach(function(r,i){
      if(!sel[i]||r.blocked)return;
      var k=r.fd.k;
      if(r.fd.list){
        var cur=c[k]||[],add=r.pro.split(',').map(function(x){return x.trim();}).filter(Boolean);
        if(prevent){
          add.forEach(function(x){if(cur.indexOf(x)<0)cur.push(x);});
          c[k]=cur;
        } else c[k]=add;
      } else if(k==='years'){c.years=Number(r.pro);}
      else c[k]=r.pro;
      applied.push(r.fd.label);
    });
    if(!applied.length){
      root.innerHTML='';
      toast('Nothing was ticked, so the record is unchanged','');
      return;
    }
    c.edited=new Date().toISOString();
    Store.markCV(c.id);
    log('Parsed resume as existing',c.name+' \u00b7 updated: '+applied.join(', '));
    notify('Record updated from a resume: '+c.name,'candidate',c.id);
    root.innerHTML='';
    toast(applied.length+' field'+(applied.length>1?'s':'')+' updated from the CV','ok');
    go('candidate',c.id,'files');
  }
  draw();
};

A.fileActions=function(candId,fileId){
  var c=byId(DB.candidates,candId);
  var f=fileList(c).filter(function(x){return x.id===fileId;})[0];
  if(!f)return;
  var root=document.getElementById('modal-root');
  var items=[];
  if(f.isResume){
    items.push(['Parse as Existing','parse']);
    items.push(['View parsed text','parsed']);
  }
  items.push(['Replace this file','replace']);
  items.push(['Remove from Files','remove']);
  root.innerHTML='<div class="scrim" data-scrim><div class="modal" style="width:min(390px,100%)" role="dialog" aria-modal="true">'+
    '<div class="modal-h"><h4>'+esc(f.name)+'</h4><p>'+esc(f.type)+' \u00b7 added '+esc(ago(f.at))+
      ' by '+esc(f.by)+'</p></div>'+
    '<div class="modal-b" style="padding:8px 0">'+items.map(function(it){
      return '<a class="lnk" style="display:block;padding:9px 16px;border-bottom:1px solid var(--line2);'+
        'font-weight:500" data-fa="'+it[1]+'" role="button" tabindex="0">'+esc(it[0])+'</a>';
    }).join('')+'</div>'+
    '<div class="modal-f"><button class="btn ghost" data-close>Cancel</button></div></div></div>';
  root.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('click',function(){root.innerHTML='';});});
  root.querySelectorAll('[data-fa]').forEach(function(b){
    b.addEventListener('click',function(){
      var k=b.getAttribute('data-fa');
      root.innerHTML='';
      if(k==='parse')A.parseExisting(candId,fileId);
      else if(k==='parsed')go('candidate',candId,'resume');
      else if(k==='replace')A.uploadCV(candId);
      else if(k==='remove'){
        c.files=fileList(c).filter(function(x){return x.id!==fileId;});
        log('Removed a file',f.name+' \u00b7 '+c.name);
        toast('File removed. The record itself is unchanged.','');
        render();
      }
    });
  });
  root.querySelector('[data-scrim]').addEventListener('mousedown',function(e){
    if(e.target===root.querySelector('[data-scrim]'))root.innerHTML='';});
};

/* ================================================================ tenant configuration
   Per the specification: picklist values, required fields and record tabs are configured
   per tenant, not fixed by Bullhorn. They are held here as data and the live constants are
   synced from it, so nothing in the views hard-codes them. */

function defaultConfig(){
  return {
    picklists:{
      candidateStatus:['New Lead','Active','Available','Submitted','Placed','Do Not Call','Archive'],
      jobStatus:['Accepting Candidates','Covered','Filled','On Hold','Closed','Cancelled'],
      submissionStatus:['New Lead','Internal Submission','Client Submission','Interview Scheduled',
        'Offer Extended','Placed'],
      submissionClosed:['Client Declined','Candidate Declined','Not Proceeding'],
      placementStatus:['Pending Approval','Approved','Rejected','Completed','Terminated'],
      companyStatus:['Prospect','Active Client','Inactive','Former Client','Do Not Contact'],
      noteAction:['Prescreen','Outbound Call','Inbound Call','Left Message','Email','Meeting',
        'Interview','Reference Check','Client Visit','Internal Memo','Other'],
      candidateSource:['LinkedIn','Indeed','Job Board','Company Website','Referral',
        'Recruiter Outreach','Other'],
      jobType:['Contract','Contract To Hire','Direct Hire'],
      employmentType:['W2','1099','Corp to Corp','Permanent'],
      category:['Information Technology','Light Industrial','Admin & Clerical','Healthcare',
        'Engineering','Finance & Accounting','Customer Support','Skilled Trades',
        'Retail Operations']
    },
    requiredFields:{
      candidate:['name','status','owner'],
      jobOrder:['title','companyId','contactId','type','employmentType','openings'],
      company:['name'],
      contact:['name','companyId']
    },
    navOrder:['dashboard','candidates','contacts','companies','jobs','pipeline','placements',
      'tasks','appts','tearsheets','search','leads','opps','approvals','notes','reports','audit',
      'data','config','guide'],
    tabs:{
      candidate:['overview','activity','notes','subs','placements','files','resume','sheets','edit'],
      job:['overview','pipeline','appts','notes','placements','files','edit']
    }
  };
}
var PICK_LABEL={
  candidateStatus:'Candidate status',jobStatus:'Job order status',
  submissionStatus:'Submission status (pipeline)',submissionClosed:'Submission closed reasons',
  placementStatus:'Placement status',companyStatus:'Company status',
  noteAction:'Note action',candidateSource:'Candidate source',
  jobType:'Job order type',employmentType:'Employment type',category:'Category / specialty'
};
var TAB_LABEL={overview:'Overview',activity:'Activity',notes:'Notes',subs:'Submissions',
  placements:'Placements',files:'Files',resume:'Resume',sheets:'Tearsheets',edit:'Edit',
  pipeline:'Submissions (pipeline)',appts:'Activity'};
var FIELD_LABEL={name:'Name',status:'Status',owner:'Owner',email:'Email',phone:'Phone',
  source:'Source',category:'Category',location:'Location',occupation:'Occupation',
  desiredRate:'Desired rate',availability:'Availability',employmentPref:'Employment preference',
  skills:'Primary skills',title:'Job title',companyId:'Company',contactId:'Contact',
  type:'Job order type',employmentType:'Employment type',openings:'Openings',
  payRate:'Pay rate',billRate:'Bill rate',salary:'Salary',flatFee:'Flat fee',
  description:'Job description',startDate:'Start date'};

/* The live constants are the same array objects the views already reference, so they are
   mutated in place rather than reassigned. */
function syncConfig(){
  var p=(DB.config&&DB.config.picklists)||defaultConfig().picklists;
  function put(arr,vals){arr.length=0;vals.forEach(function(v){arr.push(v);});}
  put(CD_STATUS,p.candidateStatus);
  put(JO_STATUS,p.jobStatus);
  put(PIPE_OUT,p.submissionClosed);
  put(PL_STATUS,p.placementStatus);
  put(CO_STATUS,p.companyStatus);
  put(NOTE_ACTIONS,p.noteAction);
  put(CD_SOURCES,p.candidateSource);
  put(JO_TYPE,p.jobType);
  put(EMP_TYPE,p.employmentType);
  put(CATEGORIES,p.category);
  /* the pipeline is a list of objects, so only relabel what is there */
  PIPE.length=0;
  var colours=['var(--p1)','var(--p2)','var(--p3)','var(--p4)','var(--p5)','var(--p6)'];
  p.submissionStatus.forEach(function(k,i){
    PIPE.push({k:k,c:colours[i]||'var(--p6)',help:''});
  });
  PIPE_K.length=0;
  p.submissionStatus.forEach(function(k){PIPE_K.push(k);});
}
function isRequired(entity,fieldKey,fallback){
  if(!entity)return !!fallback;
  var list=DB.config&&DB.config.requiredFields&&DB.config.requiredFields[entity];
  if(!list)return !!fallback;
  return list.indexOf(fieldKey)>=0;
}
function visibleTabs(entity,items){
  var order=DB.config&&DB.config.tabs&&DB.config.tabs[entity];
  if(!order)return items;
  var byKey={};
  items.forEach(function(it){byKey[it.k]=it;});
  var out=[];
  order.forEach(function(k){if(byKey[k])out.push(byKey[k]);});
  /* anything not mentioned in the configuration still renders, so a tab cannot go missing
     just because the configuration is out of date */
  items.forEach(function(it){if(order.indexOf(it.k)<0)out.push(it);});
  return out;
}

/* ---------------------------------------------------------------- configuration screen */
function vConfig(){
  var cfg=DB.config||defaultConfig();
  return '<div class="listbar"><span class="dot"></span><h2>Configuration</h2>'+
    '<span class="sp"></span><div class="btnrow">'+
    '<button class="btn ghost" data-act="cfg-reset">Reset to defaults</button></div></div>'+
    '<div class="mpad">'+
    '<p class="sub">Bullhorn holds all of this per tenant rather than fixed, so it lives here as '+
      'data rather than in the code. Changes apply immediately and are saved with everything else.</p>'+

    '<div class="sec"><h3>Picklists</h3>'+
      '<div class="grid g2">'+Object.keys(PICK_LABEL).map(function(k){
        var vals=cfg.picklists[k]||[];
        return '<div class="card"><div class="card-h"><h4>'+esc(PICK_LABEL[k])+'</h4>'+
          '<span class="sp"></span><span class="muted mono">'+vals.length+'</span>'+
          '<button class="btn ghost sm" data-act="cfg-pick" data-id="'+k+'">Edit</button></div>'+
          '<div class="card-b"><div style="display:flex;flex-wrap:wrap;gap:3px">'+
          vals.map(function(v,i){
            return '<span class="tag">'+(i+1)+'. '+esc(v)+'</span>';}).join('')+
          '</div></div></div>';
      }).join('')+'</div>'+
      '<p class="muted" style="font-size:12px;margin:9px 0 0;max-width:78ch">Order matters: it is the '+
      'order the values appear in every dropdown. Renaming a value does not rewrite records that '+
      'already carry the old one, which is exactly the trap a real reconfiguration sets.</p></div>'+

    '<div class="sec"><h3>Required fields</h3>'+
      '<div class="grid g2">'+['candidate','jobOrder','company','contact'].map(function(en){
        var all=({candidate:['name','status','owner','occupation','email','phone','source','category',
            'location','skills','desiredRate','availability','employmentPref'],
          jobOrder:['title','companyId','contactId','type','employmentType','category','openings',
            'payRate','billRate','salary','flatFee','location','startDate','description'],
          company:['name','category','status','owner'],
          contact:['name','companyId','title','phone','email','owner']})[en];
        var req=cfg.requiredFields[en]||[];
        return '<div class="card"><div class="card-h"><h4>'+esc(
            {candidate:'Candidate',jobOrder:'Job order',company:'Company',contact:'Contact'}[en])+
          '</h4><span class="sp"></span><span class="muted mono">'+req.length+' required</span></div>'+
          '<div class="card-b"><div style="display:flex;flex-direction:column;gap:5px">'+
          all.map(function(f){
            var on=req.indexOf(f)>=0;
            return '<div style="display:flex;gap:8px;align-items:center">'+
              '<span class="selbox'+(on?' on':'')+'" data-act="cfg-req" data-id="'+en+'" '+
              'data-field="'+f+'" role="checkbox" tabindex="0" aria-checked="'+on+'" '+
              'aria-label="'+(on?'Stop requiring ':'Require ')+esc(FIELD_LABEL[f]||f)+'" '+
              'title="'+(on?'Stop requiring ':'Require ')+esc(FIELD_LABEL[f]||f)+'">'+
              (on?'\u2713':'')+'</span><span style="font-size:12.5px">'+
              esc(FIELD_LABEL[f]||f)+'</span></div>';
          }).join('')+'</div></div></div>';
      }).join('')+'</div>'+
      '<p class="muted" style="font-size:12px;margin:9px 0 0;max-width:78ch">A field that is not '+
      'required still validates its own format, and still warns when left empty in permissive mode. '+
      'Turning something off removes the block, not the guidance.</p></div>'+

    '<div class="sec"><h3>Interface</h3>'+
      '<div class="card"><div class="card-b">'+
      '<div class="kv"><dt>Current interface</dt><dd>'+
        (DB.uiMode==='legacy'?'Legacy \u2014 top-bar navigation behind a Menu flyout, with open '+
          'records listed in the left column':'Redesigned \u2014 permanent left sidebar carrying all '+
          'navigation, with Fast Find and Preferences in it')+'</dd></div>'+
      '<div class="btnrow" style="margin-top:11px">'+
      '<button class="btn ghost" data-act="ui-mode">Switch to the '+
        (DB.uiMode==='legacy'?'redesigned':'legacy')+' interface</button></div>'+
      '<div class="callout warn" style="margin:12px 0 0">This switch is a feature of this sandbox, '+
      'not of Bullhorn. The redesign is a phased, mandatory migration and there is no documented '+
      'way for a user or administrator to move back. It is here so trainees can be shown whichever '+
      'interface their own account is on.</div>'+
      '<div class="callout" style="margin:10px 0 0">Open records appearing as tabs in the sidebar is '+
      'part of the legacy layout only. The redesigned sidebar is documented as navigation, Fast Find '+
      'and Preferences \u2014 nothing documents record tabs living there, so they are not shown.</div>'+
      '</div></div></div>'+

    '<div class="sec"><h3>Navigation order</h3>'+
      '<div class="card"><div class="card-b">'+
      '<p class="muted" style="font-size:12.5px;margin:0 0 10px;max-width:70ch">The redesigned '+
      'sidebar can be reordered by the user, which is documented. This is that setting.</p>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:3px">'+
      navItems().map(function(i,ix){
        return '<div style="display:flex;gap:7px;align-items:center;font-size:12.5px">'+
          '<span class="mono muted" style="width:18px">'+(ix+1)+'</span>'+
          '<span style="flex:1">'+esc(i.t)+'</span>'+
          '<button class="btn ghost sm" data-act="nav-up" data-id="'+i.v+'"'+(ix===0?' disabled':'')+
            ' aria-label="Move up">\u2191</button>'+
          '<button class="btn ghost sm" data-act="nav-dn" data-id="'+i.v+'" aria-label="Move down">\u2193</button>'+
          '</div>';
      }).join('')+'</div></div></div></div>'+

    '<div class="sec"><h3>Record tabs</h3>'+
      '<div class="grid g2">'+['candidate','job'].map(function(en){
        var order=cfg.tabs[en]||[];
        return '<div class="card"><div class="card-h"><h4>'+
          (en==='candidate'?'Candidate':'Job order')+' tabs</h4></div>'+
          '<div class="card-b"><div style="display:flex;flex-direction:column;gap:4px">'+
          order.map(function(k,i){
            return '<div style="display:flex;gap:7px;align-items:center;font-size:12.5px">'+
              '<span class="mono muted" style="width:16px">'+(i+1)+'</span>'+
              '<span style="flex:1">'+esc(TAB_LABEL[k]||k)+'</span>'+
              '<button class="btn ghost sm" data-act="cfg-tab-up" data-id="'+en+'" data-field="'+k+
                '"'+(i===0?' disabled':'')+' aria-label="Move up">\u2191</button>'+
              '<button class="btn ghost sm" data-act="cfg-tab-dn" data-id="'+en+'" data-field="'+k+
                '"'+(i===order.length-1?' disabled':'')+' aria-label="Move down">\u2193</button>'+
              '</div>';
          }).join('')+'</div>'+
          '<p class="muted" style="font-size:11.5px;margin:10px 0 0">Overview, Notes, Files and Edit '+
          'cannot be removed, matching the documented baseline. Order is yours.</p>'+
          '</div></div>';
      }).join('')+'</div></div>'+
    '</div>';
}

A.cfgPicklist=function(key){
  var cfg=DB.config;
  openForm({title:'Edit '+(PICK_LABEL[key]||key),
    intro:'One value per line, in the order they should appear in the dropdown. This is the same thing an administrator does in a real tenant, which is why nothing in this application treats these as fixed.',
    fields:[{k:'vals',label:'Values',type:'textarea',required:true,
      value:(cfg.picklists[key]||[]).join('\n'),
      hint:'Blank lines are ignored. Removing a value that records already carry leaves those records showing it.'}],
    submit:'Save picklist',
    validate:function(v){
      var e={};
      var list=String(v.vals||'').split('\n').map(function(x){return x.trim();}).filter(Boolean);
      if(list.length<2)e.vals='HARD STOP: a picklist needs at least two values.';
      var seen={},dup=null;
      list.forEach(function(x){if(seen[x])dup=x;seen[x]=1;});
      if(dup)e.vals='HARD STOP: "'+dup+'" appears twice.';
      if(key==='submissionStatus'&&list.length!==6)
        e.vals='The pipeline board is built for six stages. Changing the count needs the board '+
          'reworked as well, so this one is fixed at six here.';
      return e;
    },
    onSubmit:function(v){
      var list=String(v.vals).split('\n').map(function(x){return x.trim();}).filter(Boolean);
      var before=(cfg.picklists[key]||[]).join(', ');
      cfg.picklists[key]=list;
      syncConfig();
      log('Reconfigured picklist',(PICK_LABEL[key]||key)+': '+before+' \u2192 '+list.join(', '));
      toast('Picklist updated','ok');
      Store.save(true);render();
    }});
};
A.cfgRequired=function(entity,field){
  var list=DB.config.requiredFields[entity]||(DB.config.requiredFields[entity]=[]);
  var LOCKED={candidate:['name'],jobOrder:['title','companyId'],company:['name'],contact:['name','companyId']};
  if((LOCKED[entity]||[]).indexOf(field)>=0){
    toast('That field anchors the record and cannot be made optional','no');return;
  }
  var i=list.indexOf(field);
  if(i>=0)list.splice(i,1);else list.push(field);
  log('Reconfigured required fields',entity+': '+(FIELD_LABEL[field]||field)+
    (i>=0?' no longer required':' now required'));
  Store.save(true);render();
};
A.cfgTabMove=function(entity,key,dir){
  var order=DB.config.tabs[entity];
  var i=order.indexOf(key);
  if(i<0)return;
  var j=i+dir;
  if(j<0||j>=order.length)return;
  order.splice(i,1);order.splice(j,0,key);
  log('Reordered tabs',entity+': '+(TAB_LABEL[key]||key)+' to position '+(j+1));
  Store.save(true);render();
};
A.navMove=function(v,dir){
  var order=DB.config.navOrder||(DB.config.navOrder=[]);
  var i=order.indexOf(v);
  if(i<0){order.push(v);i=order.length-1;}
  var j=i+dir;
  if(j<0||j>=order.length)return;
  order.splice(i,1);order.splice(j,0,v);
  log('Reordered navigation',v+' to position '+(j+1));
  Store.save(true);render();
};
A.cfgReset=function(){
  openForm({title:'Reset the configuration',
    intro:'Picklists, required fields and tab order go back to the values this sandbox ships with. Records are untouched.',
    fields:[{k:'ack',label:'Reset the configuration',type:'check',required:true}],
    submit:'Reset',
    onSubmit:function(){
      DB.config=defaultConfig();syncConfig();
      log('Reset the configuration','');
      toast('Configuration reset','ok');
      Store.save(true);render();
    }});
};

/* ================================================================ dashboard charts
   Inline SVG so the application keeps no dependencies. */
var CHART_COLS=['#2087DC','#E85D9A','#4EB07C','#F0A63C','#7B62D6','#37B3C4','#E3644B','#9BAAB8',
  '#2F6E9E','#B4519C','#3E8F63','#C98A16'];

function svgPie(slices,opts){
  opts=opts||{};
  var size=opts.size||168,r=size/2-2,cx=size/2,cy=size/2;
  var total=slices.reduce(function(a,s){return a+s.v;},0);
  if(!total)return '<div class="muted" style="font-size:12.5px;padding:14px">Nothing to chart yet.</div>';
  var a0=-Math.PI/2,paths='';
  slices.forEach(function(s,i){
    var frac=s.v/total,a1=a0+frac*Math.PI*2;
    var col=s.c||CHART_COLS[i%CHART_COLS.length];
    if(frac>=0.9999){
      paths+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'"></circle>';
    } else {
      var x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0);
      var x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
      paths+='<path d="M'+cx+','+cy+' L'+x0.toFixed(1)+','+y0.toFixed(1)+
        ' A'+r+','+r+' 0 '+(frac>0.5?1:0)+',1 '+x1.toFixed(1)+','+y1.toFixed(1)+' Z" '+
        'fill="'+col+'" stroke="#fff" stroke-width="1"><title>'+esc(s.k)+': '+s.v+
        ' ('+Math.round(frac*100)+'%)</title></path>';
    }
    a0=a1;
  });
  return '<div class="chart-wrap">'+
    '<svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" role="img" '+
      'aria-label="'+esc(opts.label||'Pie chart')+'">'+paths+'</svg>'+
    '<ul class="chart-key">'+slices.map(function(s,i){
      var col=s.c||CHART_COLS[i%CHART_COLS.length];
      return '<li><i style="background:'+col+'"></i><span class="k">'+esc(s.k)+'</span>'+
        '<span class="v">'+s.v+'</span></li>';
    }).join('')+'</ul></div>';
}

function svgLine(pts,opts){
  opts=opts||{};
  var w=opts.w||420,h=opts.h||140,pl=28,pb=20,pt=8,pr=6;
  if(!pts.length)return '<div class="muted" style="font-size:12.5px;padding:14px">Nothing to chart yet.</div>';
  var max=Math.max.apply(null,pts.map(function(p){return p.v;}));
  if(max<=0)max=1;
  var iw=w-pl-pr,ih=h-pt-pb;
  var step=pts.length>1?iw/(pts.length-1):0;
  var xy=pts.map(function(p,i){
    return {x:pl+i*step,y:pt+ih-(p.v/max)*ih,p:p};
  });
  var line=xy.map(function(q,i){return (i?'L':'M')+q.x.toFixed(1)+','+q.y.toFixed(1);}).join(' ');
  var area=line+' L'+(pl+iw).toFixed(1)+','+(pt+ih)+' L'+pl+','+(pt+ih)+' Z';
  var grid='';
  [0,0.5,1].forEach(function(f){
    var y=pt+ih-f*ih;
    grid+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(pl+iw)+'" y2="'+y.toFixed(1)+
      '" stroke="#E7ECF1" stroke-width="1"></line>'+
      '<text x="'+(pl-5)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" '+
      'font-size="8" fill="#8A96A3">'+Math.round(f*max)+'</text>';
  });
  var labels=xy.map(function(q,i){
    if(pts.length>7&&i%2)return '';
    return '<text x="'+q.x.toFixed(1)+'" y="'+(h-6)+'" text-anchor="middle" font-size="8" '+
      'fill="#8A96A3">'+esc(q.p.k)+'</text>';
  }).join('');
  var dots=xy.map(function(q){
    return '<circle cx="'+q.x.toFixed(1)+'" cy="'+q.y.toFixed(1)+'" r="3" fill="#fff" '+
      'stroke="#2087DC" stroke-width="2"><title>'+esc(q.p.k)+': '+q.p.v+'</title></circle>';
  }).join('');
  return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" preserveAspectRatio="none" '+
    'role="img" aria-label="'+esc(opts.label||'Line chart')+'">'+grid+
    '<path d="'+area+'" fill="rgba(32,135,220,.14)"></path>'+
    '<path d="'+line+'" fill="none" stroke="#2087DC" stroke-width="2"></path>'+
    dots+labels+'</svg>';
}

function monthBuckets(n){
  var out=[];
  for(var i=n-1;i>=0;i--){
    var d=new Date(TODAY.getFullYear(),TODAY.getMonth()-i,1);
    out.push({k:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()],
      y:d.getFullYear(),m:d.getMonth(),v:0});
  }
  return out;
}
function bucketBy(rows,dateOf,n){
  var b=monthBuckets(n||8);
  rows.forEach(function(x){
    var d=new Date(dateOf(x));
    for(var i=0;i<b.length;i++)
      if(b[i].m===d.getMonth()&&b[i].y===d.getFullYear()){b[i].v++;break;}
  });
  return b;
}
function tally(rows,keyOf,order){
  var m={};
  rows.forEach(function(x){var k=keyOf(x)||'\u2014';m[k]=(m[k]||0)+1;});
  var keys=order?order.filter(function(k){return m[k];}):Object.keys(m).sort(function(a,b){return m[b]-m[a];});
  Object.keys(m).forEach(function(k){if(keys.indexOf(k)<0)keys.push(k);});
  return keys.map(function(k){return {k:k,v:m[k]};});
}

/* ---------------------------------------------------------------- cards */
var DASH_CARDS={
  attention:{t:'Needs Attention',build:function(){
    var flags=[
      {n:staleSubs().length,t:'submissions with no status change for 5+ days',v:'pipeline'},
      {n:pendingTime().length,t:'time entries awaiting approval',v:'approvals'},
      {n:pendingPlacements().length,t:'placements pending approval',v:'placements'},
      {n:onboardGaps().length,t:'placements with an incomplete onboarding pack',v:'placements'},
      {n:openJobs().filter(function(j){return jobSubs(j.id).length===0;}).length,
        t:'live job orders with an empty pipeline',v:'jobs'}
    ].filter(function(x){return x.n>0;});
    return flags.length
      ?'<table><tbody>'+flags.map(function(x){
        return '<tr class="click" data-go="'+x.v+'"><td style="width:46px">'+
          '<span class="pill p-warn">'+x.n+'</span></td><td>'+esc(x.t)+'</td>'+
          '<td style="text-align:right"><span class="lnk">Open</span></td></tr>';
      }).join('')+'</tbody></table>'
      :'<div class="empty" style="padding:18px"><b>Nothing needs attention</b>'+
        'Every live record is inside tolerance.</div>';
  }},
  jobsNoCoverage:{t:'Jobs without Coverage',build:function(){
    var bare=openJobs().filter(function(j){return jobSubs(j.id).length===0;});
    var pts=bucketBy(DB.jobs.filter(function(j){return jobSubs(j.id).length===0;}),
      function(j){return j.added;},8);
    return '<div class="card-b" style="padding-bottom:4px">'+
      svgLine(pts,{label:'Job orders added without submissions, by month'})+'</div>'+
      '<div style="padding:0 11px 4px;font-size:11.5px;font-weight:700;color:var(--label);'+
      'letter-spacing:.04em;text-transform:uppercase">Jobs added without submissions</div>'+
      (bare.length?'<table><thead><tr><th>Job order</th><th>Owner</th><th>Status</th>'+
        '<th>Date added</th></tr></thead><tbody>'+
        bare.slice(0,5).map(function(j){
          return '<tr class="click" data-go="job" data-id="'+j.id+'">'+
            '<td><span class="lnk">'+esc(j.title)+'</span>'+
            '<div class="muted" style="font-size:11.5px">'+esc(coName(j.companyId))+'</div></td>'+
            '<td class="muted">'+esc(j.owner)+'</td>'+
            '<td>'+joPill(j)+'</td>'+
            '<td class="muted">'+fmtD(j.added)+'</td></tr>';
        }).join('')+'</tbody></table>'
        :'<div class="muted" style="font-size:12.5px;padding:6px 11px 12px">Every live job order has '+
          'at least one candidate on it.</div>');
  }},
  companiesByStatus:{t:'Companies by Status',build:function(){
    return '<div class="card-b">'+svgPie(tally(DB.companies,function(c){return c.status;},CO_STATUS),
      {label:'Companies by status'})+'</div>';
  }},
  submissionsByStatus:{t:'Submissions by Status',build:function(){
    return '<div class="card-b">'+svgPie(tally(DB.subs,function(s){return s.status;},
      PIPE_K.concat(PIPE_OUT)),{label:'Submissions by status'})+'</div>';
  }},
  leadsByStatus:{t:'Leads by Status',build:function(){
    return '<div class="card-b">'+svgPie(tally(DB.leads,function(l){return l.status;},LEAD_STATUS),
      {label:'Leads by status'})+'</div>';
  }},
  candidatesByCategory:{t:'Candidates by Category',build:function(){
    return '<div class="card-b">'+svgPie(tally(DB.candidates,function(c){return c.category;}),
      {label:'Candidates by category'})+'</div>';
  }},
  companiesOverTime:{t:'Companies over Time',build:function(){
    var rows=DB.companies.slice().sort(function(a,b){return new Date(a.since)-new Date(b.since);});
    return '<table><thead><tr><th>Company</th><th>Status</th><th class="num">Age</th></tr></thead><tbody>'+
      rows.map(function(c){
        var days=daysBetween(c.since,new Date());
        return '<tr class="click" data-go="company" data-id="'+c.id+'">'+
          '<td><span class="lnk">'+esc(c.name)+'</span></td>'+
          '<td class="muted">'+esc(c.status)+'</td>'+
          '<td class="num">'+days+' days</td></tr>';
      }).join('')+'</tbody></table>';
  }},
  placementsOverTime:{t:'Placements over Time',build:function(){
    return '<div class="card-b">'+svgLine(bucketBy(DB.placements,function(p){return p.start;},8),
      {label:'Placements by start month'})+'</div>';
  }},
  funnel:{t:'Submission Funnel',build:function(){
    var f=funnel(DB.subs);
    return '<div class="card-b"><div class="fun">'+PIPE.map(function(st,i){
      var n=f[st.k],top=f[PIPE_K[0]]||1,prev=i?f[PIPE_K[i-1]]:null;
      return '<div class="fun-row"><span>'+esc(st.k)+'</span>'+
        '<div class="fun-bar"><span style="width:'+Math.max(2,pct(n,top))+'%;background:'+st.c+'"></span></div>'+
        '<span class="r">'+n+(prev?' \u00b7 '+pct(n,prev)+'%':'')+'</span></div>';
    }).join('')+'</div></div>';
  }},
  tasks:{t:'Open Tasks',build:function(){
    var open=DB.tasks.filter(function(t){return !t.done;});
    return open.length?taskTable(open.slice(0,6))
      :'<div class="empty" style="padding:18px"><b>Nothing outstanding</b></div>';
  }},
  practice:{t:'Practice Progress',build:function(){
    if(DB.training===false)
      return '<div class="muted" style="font-size:12.5px;padding:14px">Training mode is off.</div>';
    var st=scenarioState(activeScenario);
    return '<div class="card-b"><div class="kv">'+
      '<dt>Scenario</dt><dd>'+esc(st.sc.name)+'</dd>'+
      '<dt>Steps complete</dt><dd>'+st.done+' of '+st.total+'</dd>'+
      '<dt>Desk review</dt><dd>'+(DB.quiz?DB.quiz.score+'/3':'not attempted')+'</dd>'+
      '<dt>Knowledge check</dt><dd>'+(DB.assess?DB.assess.score+'/'+DB.assess.total:'not attempted')+'</dd>'+
      '</div></div>';
  }}
};
var DASH_DEFAULT=['jobsNoCoverage','companiesByStatus','submissionsByStatus',
  'companiesOverTime','candidatesByCategory','placementsOverTime'];

function dashCards(){
  if(!DB.config.dashCards)DB.config.dashCards=DASH_DEFAULT.slice();
  /* cards that belong on the dashboard were briefly listed here; drop them once */
  if(!DB.config.dashMigrated){
    DB.config.dashCards=DB.config.dashCards.filter(function(k){
      return ['attention','funnel','tasks','practice'].indexOf(k)<0;});
    if(!DB.config.dashCards.length)DB.config.dashCards=DASH_DEFAULT.slice();
    DB.config.dashMigrated=true;
  }
  return DB.config.dashCards.filter(function(k){return DASH_CARDS[k];});
}
A.dashHide=function(k){
  DB.config.dashCards=dashCards().filter(function(x){return x!==k;});
  log('Removed a dashboard card',(DASH_CARDS[k]||{}).t||k);
  Store.save(true);render();
};
A.dashAdd=function(){
  var shown=dashCards();
  var avail=Object.keys(DASH_CARDS).filter(function(k){return shown.indexOf(k)<0;});
  if(!avail.length){toast('Every card is already on the dashboard','');return;}
  openForm({title:'Add Card',
    intro:'Cards can be added and removed, and the choice is remembered against your user. This is the same idea as the card layout on a record.',
    fields:[{k:'card',label:'Card',type:'select',required:true,
      options:avail.map(function(k){return {v:k,t:DASH_CARDS[k].t};})}],
    submit:'Add card',
    onSubmit:function(v){
      DB.config.dashCards=shown.concat([v.card]);
      log('Added a dashboard card',DASH_CARDS[v.card].t);
      toast('Card added','ok');
      Store.save(true);render();
    }});
};

/* ---------------------------------------------------------------- coach */
function renderCoach(){
  var st=scenarioState(activeScenario);
  var desk=DESKS[DB.desk||'d360']||DESKS.d360;
  var el=document.getElementById('coach');
  var fab=document.getElementById('fab-root');
  if(DB.training===false){
    el.className='coach mini';el.innerHTML='';
    if(fab)fab.innerHTML='';
    return;
  }
  if(coachMini){
    el.className='coach mini';
    el.innerHTML='';
    if(fab){
      var C=2*Math.PI*10.5;
      var done=st.total?C*st.done/st.total:0;
      fab.innerHTML='<button class="fab" data-act="coach" '+
        'title="Open the practice tasks panel" aria-label="Open the practice tasks panel, '+
        st.done+' of '+st.total+' steps done">'+
        '<svg class="ring" viewBox="0 0 26 26" aria-hidden="true">'+
          '<circle cx="13" cy="13" r="10.5" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2.5"></circle>'+
          '<circle cx="13" cy="13" r="10.5" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" '+
          'stroke-dasharray="'+done.toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 13 13)"></circle>'+
          '<text x="13" y="16.5" text-anchor="middle">'+st.done+'</text>'+
        '</svg>'+
        '<span class="lb">Practice tasks<small>'+st.done+' of '+st.total+' done</small></span></button>';
    }
    return;
  }
  if(fab)fab.innerHTML='';
  el.className='coach';
  el.innerHTML='<div style="display:flex;align-items:flex-start;gap:8px">'+
      '<div style="flex:1"><h3>Practice tasks</h3>'+
        '<div style="font-size:11px;color:var(--coach)">'+
        esc((DESKS[DB.desk||'d360']||DESKS.d360).t)+'</div></div>'+
      '<button class="coach-collapse" data-act="coach" title="Collapse the panel" '+
      'aria-label="Collapse the practice tasks panel">&#8250;</button></div>'+
    '<p class="cs" style="margin-top:-2px">Guidance layer. Not part of the system being taught.</p>'+
    '<label class="coach-lbl" for="deskpick">Desk type</label>'+
    '<select id="deskpick" data-desk aria-label="Desk type">'+DESK_ORDER.map(function(k){
      return '<option value="'+k+'"'+(k===(DB.desk||'d360')?' selected':'')+'>'+
        esc(DESKS[k].t)+'</option>';
    }).join('')+'</select>'+
    '<p class="coach-ends">'+esc(desk.blurb)+'<br><b>Finishes at '+esc(desk.ends)+'.</b></p>'+
    '<label class="coach-lbl" for="scenpick">Scenario</label>'+
    '<select id="scenpick" data-scenario aria-label="Scenario">'+Object.keys(SCENARIOS).map(function(k){
      return '<option value="'+k+'"'+(k===activeScenario?' selected':'')+'>'+esc(SCENARIOS[k].name)+'</option>';
    }).join('')+'</select>'+
    '<div class="prog"><div class="t"><span>'+esc(st.sc.blurb)+'</span></div>'+
      '<div class="t"><b>'+st.done+' of '+st.total+' done</b><span>'+pct(st.done,st.total)+'%</span></div>'+
      '<div class="bar"><span style="width:'+pct(st.done,st.total)+'%"></span></div></div>'+
    (st.done===st.total?'<div class="coach-done">Scenario complete. Take a session summary before you reset, then move to the next scenario.</div>':'')+
    '<div class="steps">'+st.steps.map(function(s,i){
      var cls=st.flags[i]?'done':(i===st.now?'now':'');
      return '<div class="step '+cls+'"><span class="ix">'+(st.flags[i]?'✓':(i+1))+'</span>'+
        '<span class="tx">'+esc(s.t)+'<span class="hw">'+esc(s.h)+'</span></span></div>';
    }).join('')+'</div><hr>'+
    '<div class="coach-note">Steps tick automatically when the underlying record is correct. Nothing can be marked complete by hand — the data has to actually be right.</div>'+
    '<hr><button class="btn ghost sm" data-act="tour" style="width:100%">'+
    (DB.tourSeen?'Replay the guided tour':'Take the guided tour (2 min)')+'</button>';
}

/* ---------------------------------------------------------------- render */
var VIEWS={dashboard:vDashboard,tasks:vTasks,appts:vAppts,leads:vLeads,lead:vLead,opps:vOpps,opp:vOpp,
  companies:vCompanies,company:vCompany,contacts:vContacts,contact:vContact,jobs:vJobs,job:vJob,
  candidates:vCandidates,candidate:vCandidate,pipeline:vPipeline,tearsheets:vTearsheets,tearsheet:vTearsheet,
  search:vSearch,data:vData,config:vConfig,
  placements:vPlacements,placement:vPlacement,approvals:vApprovals,notes:vNotes,reports:vReports,
  audit:vAudit,guide:vGuide};

/* The Submissions tab is documented as a funnel: stage buckets with counts, each mapping to
   a set of statuses that a tenant can extend. */
var FUNNEL=[
  {k:'all',t:'All'},
  {k:'sub',t:'Submissions',has:['New Lead','Internal Submission','Client Submission']},
  {k:'int',t:'Interviewing',has:['Interview Scheduled']},
  {k:'con',t:'Confirmed',has:['Offer Extended','Placed']},
  {k:'rej',t:'Rejected',fromClosed:true}
];
var jobFunnel='all';
function funnelCount(subs,f){
  if(f.k==='all')return subs.length;
  if(f.fromClosed)return subs.filter(function(s){return PIPE_OUT.indexOf(s.status)>=0;}).length;
  return subs.filter(function(s){return (f.has||[]).indexOf(s.status)>=0;}).length;
}
function funnelBar(subs){
  return '<div class="funnel">'+FUNNEL.map(function(f){
    return '<a class="fn'+(jobFunnel===f.k?' on':'')+'" data-act="funnel" data-id="'+f.k+
      '" role="button" tabindex="0"><span class="t">'+esc(f.t)+'</span>'+
      '<span class="n">'+funnelCount(subs,f)+'</span></a>';
  }).join('')+'</div>';
}
function funnelKeeps(s){
  if(jobFunnel==='all')return true;
  var f=FUNNEL.filter(function(x){return x.k===jobFunnel;})[0];
  if(!f)return true;
  if(f.fromClosed)return PIPE_OUT.indexOf(s.status)>=0;
  return (f.has||[]).indexOf(s.status)>=0;
}
var PEEK={type:null,id:null,tab:'details'};
A.stageOpen=function(status){
  /* the documentation says clicking a reached workflow icon opens the relevant submission */
  var pool=[];
  if(route.view==='candidate')pool=candSubs(route.id);
  else if(route.view==='job')pool=jobSubs(route.id);
  var hit=pool.filter(function(s){
    return (s.history||[]).some(function(h){return h.status===status;});
  }).sort(function(a,b){return new Date(b.modified)-new Date(a.modified);})[0];
  if(!hit){toast('No submission has reached '+status+' on this record','no');return;}
  A.openSub(hit.id);
};
A.peek=function(type,id,tab){PEEK={type:type,id:id,tab:tab||'details'};renderPeek();};
A.peekClose=function(){PEEK={type:null,id:null,tab:'details'};renderPeek();};
function renderPeek(){
  var root=document.getElementById('peek-root');
  if(!root)return;
  if(!PEEK.id){root.innerHTML='';return;}
  var body='',tabs=[],name='',sub='',type=PEEK.type;
  if(type==='candidate'){
    var c=byId(DB.candidates,PEEK.id);
    if(!c){root.innerHTML='';return;}
    name=c.name;sub=c.occupation+' \u00b7 '+c.location;
    var subs=candSubs(c.id),notes=notesFor('candidateId',c.id);
    tabs=[{k:'details',t:'Details'},{k:'notes',t:'Notes',n:notes.length},
      {k:'cv',t:'Resume'},{k:'subs',t:'Submissions',n:subs.length}];
    if(PEEK.tab==='details'){
      body=detailRows([['Status',c.status],['Occupation',c.occupation],['Location',c.location],
        ['Availability',c.availability],['Desired Rate',money(c.desiredRate)+' /hr'],
        ['Preference',c.employmentPref],['Source',c.source],['Owner',c.owner],
        ['Mobile Phone',c.phone],['Email 1','<span class="lnk">'+esc(c.email)+'</span>',1],
        ['Primary Skills',(c.skills||[]).map(function(x){
          return '<span class="tag">'+esc(x)+'</span>';}).join('')||'\u2014',1],
        ['CV',c.cv?esc(c.cvName||'on file'):'none on file']]);
    } else if(PEEK.tab==='notes'){
      body='<div style="padding:12px">'+noteList(notes,'Nothing logged against this candidate.')+'</div>';
    } else if(PEEK.tab==='cv'){
      body=c.cv
        ?'<pre style="margin:0;padding:12px;white-space:pre-wrap;font-family:var(--mono);font-size:11.5px;line-height:1.55">'+esc(c.cv)+'</pre>'
        :'<div class="empty" style="padding:22px"><b>No CV on file</b>Without CV text this candidate cannot be found by boolean search.</div>';
    } else {
      body=subs.length?'<table><tbody>'+subs.map(function(x){
        var j=byId(DB.jobs,x.jobId);
        return '<tr><td><span class="lnk" data-go="job" data-id="'+x.jobId+'">'+esc(jobName(x.jobId))+
          '</span><div class="muted" style="font-size:11.5px">'+esc(coName(j?j.companyId:''))+'</div></td>'+
          '<td>'+subPill(x.status)+'</td></tr>';
      }).join('')+'</tbody></table>'
      :'<div class="empty" style="padding:22px"><b>Not on any pipeline</b></div>';
    }
  } else if(type==='job'){
    var j2=byId(DB.jobs,PEEK.id);
    if(!j2){root.innerHTML='';return;}
    name=j2.title;sub=coName(j2.companyId)+' \u00b7 '+j2.location;
    var js=jobSubs(j2.id),jn=notesFor('jobId',j2.id);
    tabs=[{k:'details',t:'Details'},{k:'notes',t:'Notes',n:jn.length},{k:'subs',t:'Pipeline',n:js.length}];
    if(PEEK.tab==='details'){
      body=detailRows([['Status',j2.status],['Type',j2.type],
        ['Openings',j2.filled+' of '+j2.openings+' filled'],['Location',j2.location],
        ['Contact',ctName(j2.contactId)],['Pay Rate',money(j2.payRate)+' /hr'],
        ['Bill Rate',money(j2.billRate)+' /hr'],['Gross Margin',margin(j2.payRate,j2.billRate)+'%'],
        ['Owner',j2.owner],['Date Added',fmtD(j2.added)],['Description',esc(j2.description),1]]);
    } else if(PEEK.tab==='notes'){
      body='<div style="padding:12px">'+noteList(jn,'No client conversations logged.')+'</div>';
    } else {
      body=js.length?'<table><tbody>'+js.map(function(x){
        return '<tr><td><span class="lnk" data-go="candidate" data-id="'+x.candidateId+'">'+
          esc(candName(x.candidateId))+'</span></td><td>'+subPill(x.status)+'</td></tr>';
      }).join('')+'</tbody></table>'
      :'<div class="empty" style="padding:22px"><b>Nothing on this pipeline yet</b></div>';
    }
  } else if(type==='company'){
    var co=byId(DB.companies,PEEK.id);
    if(!co){root.innerHTML='';return;}
    name=co.name;sub=co.category+' \u00b7 '+co.status;
    var cts=coContacts(co.id),cjs=coJobs(co.id),cn=notesFor('companyId',co.id);
    tabs=[{k:'details',t:'Details'},{k:'contacts',t:'Contacts',n:cts.length},
      {k:'subs',t:'Job Orders',n:cjs.length},{k:'notes',t:'Notes',n:cn.length}];
    if(PEEK.tab==='details'){
      body=detailRows([['Status',co.status],['Category',co.category],['Owner',co.owner],
        ['Employees',co.employees],['Client Since',fmtD(co.since)],
        ['Live Job Orders',String(cjs.filter(function(x){return openJobs().indexOf(x)>=0;}).length)]]);
    } else if(PEEK.tab==='contacts'){
      body=cts.length?'<table><tbody>'+cts.map(function(x){
        return '<tr><td><span class="lnk" data-go="contact" data-id="'+x.id+'">'+esc(x.name)+
          '</span><div class="muted" style="font-size:11.5px">'+esc(x.title)+'</div></td></tr>';
      }).join('')+'</tbody></table>':'<div class="empty" style="padding:22px"><b>No contacts</b></div>';
    } else if(PEEK.tab==='subs'){
      body=cjs.length?'<table><tbody>'+cjs.map(function(x){
        return '<tr><td><span class="lnk" data-go="job" data-id="'+x.id+'">'+esc(x.title)+
          '</span></td><td>'+joPill(x)+'</td></tr>';
      }).join('')+'</tbody></table>':'<div class="empty" style="padding:22px"><b>No job orders</b></div>';
    } else {
      body='<div style="padding:12px">'+noteList(cn,'Nothing logged.')+'</div>';
    }
  } else { root.innerHTML=''; return; }
  root.innerHTML='<div class="peek" role="dialog" aria-label="Record preview">'+
    '<div class="peek-h"><span class="ricon">'+(REC_ICON[type]||'\u2630')+'</span>'+
      '<div style="min-width:0;flex:1"><div class="nm">'+esc(name)+'</div><div class="sb">'+esc(sub)+'</div></div>'+
      '<button data-act="peek-open" data-type="'+type+'" data-id="'+esc(PEEK.id)+'" class="btn sm" '+
        'title="Open the full record">Open</button>'+
      '<button class="x" data-act="peek-close" aria-label="Close the preview">\u00d7</button></div>'+
    '<div class="peek-tabs">'+tabs.map(function(t){
      return '<a data-act="peek-tab" data-tab="'+t.k+'" class="'+(PEEK.tab===t.k?'on':'')+'" '+
        'role="button" tabindex="0">'+esc(t.t)+(t.n!=null?' <span class="ct">'+t.n+'</span>':'')+'</a>';
    }).join('')+'</div><div class="peek-b">'+body+'</div></div>';
  focusable(root);
}

var DRAG={id:null};
function wireDrag(scope){
  scope.querySelectorAll('[data-sub][draggable]').forEach(function(el){
    el.addEventListener('dragstart',function(e){
      DRAG.id=el.getAttribute('data-sub');
      el.classList.add('dragging');
      if(e.dataTransfer){
        try{e.dataTransfer.setData('text/plain',DRAG.id);}catch(x){}
        e.dataTransfer.effectAllowed='move';
      }
    });
    el.addEventListener('dragend',function(){
      DRAG.id=null;el.classList.remove('dragging');
      scope.querySelectorAll('.rung-b.over').forEach(function(z){z.classList.remove('over');});
    });
  });
  scope.querySelectorAll('[data-drop]').forEach(function(zone){
    zone.addEventListener('dragover',function(e){
      e.preventDefault();
      if(e.dataTransfer)e.dataTransfer.dropEffect='move';
      zone.classList.add('over');
    });
    zone.addEventListener('dragleave',function(){zone.classList.remove('over');});
    zone.addEventListener('drop',function(e){
      e.preventDefault();
      zone.classList.remove('over');
      var id=DRAG.id||(e.dataTransfer?e.dataTransfer.getData('text/plain'):null);
      DRAG.id=null;
      if(id)A.dropSub(id,zone.getAttribute('data-drop'));
    });
  });
}
A.dropSub=function(subId,targetStatus){
  var sub=byId(DB.subs,subId);
  if(!sub){toast('That submission no longer exists','no');return;}
  var job=byId(DB.jobs,sub.jobId);
  if(job&&['Closed','Cancelled'].indexOf(job.status)>=0){
    toast('The job order is '+job.status.toLowerCase()+', so its submissions are read only','no');return;
  }
  var from=pIx(sub.status),to=pIx(targetStatus);
  if(to<0){toast('That is not a pipeline status','no');return;}
  if(to===from){return;}
  if(to<from){
    openInfo('Statuses do not move backwards',
      candName(sub.candidateId)+' is at '+sub.status+'. Dragging back to '+targetStatus+
      ' would rewrite what has already happened. If the submission is finished, close it with a reason instead.',
      '','warn');
    return;
  }
  if(to>from+1){
    openInfo('One status at a time',
      'You are trying to move '+candName(sub.candidateId)+' from '+sub.status+' straight to '+
      targetStatus+', skipping '+(to-from-1)+' step'+((to-from-1)>1?'s':'')+
      '. Each stage asks for something the next one depends on, so move it one column at a time.',
      '<p style="margin:0;font-size:13px">Next step: <b>'+esc(PIPE_K[from+1])+'</b></p>','warn');
    return;
  }
  A.advance(subId);
};
function focusable(scope){
  scope.querySelectorAll('[data-act],[data-go]').forEach(function(el){
    var t=el.tagName;
    if(t==='BUTTON'||t==='A'||t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return;
    if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','0');
    if(!el.hasAttribute('role'))el.setAttribute('role','button');
  });
}
var RECORD_LABEL={
  company:function(id){return coName(id);},contact:function(id){return ctName(id);},
  candidate:function(id){return candName(id);},job:function(id){return jobName(id);},
  placement:function(id){var p=byId(DB.placements,id);return p?candName(p.candidateId):'';},
  tearsheet:function(id){var t=byId(DB.tearsheets,id);return t?t.name:'';},
  lead:function(id){var l=byId(DB.leads,id);return l?l.name:'';},
  opp:function(id){var o=byId(DB.opps,id);return o?o.title:'';}
};
function render(){
  var main=document.getElementById('main');
  var v=VIEWS[route.view]||vDashboard;
  main.innerHTML=v();
  if(RECORD_LABEL[route.view]&&route.id){
    var lbl=RECORD_LABEL[route.view](route.id);
    if(lbl)pushTab(route.view,route.id,lbl);
  }
  var bell=document.getElementById('bell-root');
  if(bell){
    var nun=unread();
    bell.innerHTML='<span data-act="notifs" role="button" tabindex="0" title="Notifications" '+
      'style="cursor:pointer;position:relative;display:inline-block;padding:0 2px;line-height:1">'+
      '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style="vertical-align:-3px">'+
        '<path d="M8 1.5a3.5 3.5 0 0 0-3.5 3.5v2.2L3.2 10.2h9.6L11.5 7.2V5A3.5 3.5 0 0 0 8 1.5z" '+
        'fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>'+
        '<path d="M6.4 12a1.6 1.6 0 0 0 3.2 0" fill="none" stroke="currentColor" stroke-width="1.3"/>'+
      '</svg>'+
      (nun?'<span style="position:absolute;top:-6px;right:-8px;background:var(--bad);color:#fff;'+
        'border-radius:9px;font-size:10px;font-weight:700;padding:0 5px;line-height:15px">'+nun+'</span>':'')+
      '</span>';
  }
  var pm=document.getElementById('pmode');
  if(pm){
    pm.textContent=DB.permissive?'Rules: permissive':'Rules: strict';
    pm.title=DB.permissive
      ?'Permissive mode. Data-quality rules warn and can be overridden, which is how most live systems behave. Overrides are logged.'
      :'Strict mode. Data-quality rules block the save. Good for teaching the discipline; not how production behaves.';
  }
  var tm=document.getElementById('tmode');
  if(tm){
    tm.textContent=DB.training===false?'Training: off':'Training: on';
    tm.title=DB.training===false
      ?'Training mode is off. Turn it on for practice tasks and coaching notes.'
      :'Training mode is on. Turn it off to use this as a plain ATS.';
  }
  renderTabs();renderCoach();renderRail();focusable(main);wireDrag(main);renderPeek();
  main.setAttribute('data-booted','1');
  if(candFocus){
    var cf=document.getElementById('cand-filter');
    if(cf){cf.focus();try{cf.setSelectionRange(cf.value.length,cf.value.length);}catch(e){}}
    candFocus=false;
  }
  Store.save();
}
function go(view,id,tab){
  route={view:view,id:id||null,tab:tab||null};
  PEEK={type:null,id:null,tab:'details'};
  document.getElementById('main').scrollTop=0;
  document.getElementById('ff-res').innerHTML='';
  render();
}

/* ---------------------------------------------------------------- events */
document.addEventListener('click',function(e){
  var tc=e.target.closest('[data-tabclose]');
  if(tc){
    e.preventDefault();e.stopPropagation();
    var cid=tc.getAttribute('data-tabclose');
    openTabs=openTabs.filter(function(t){return t.id!==cid;});
    if(route.id===cid){go(openTabs.length?openTabs[0].type:'dashboard',openTabs.length?openTabs[0].id:null);}
    else renderTabs();
    return;
  }
  var to=e.target.closest('[data-tabopen]');
  if(to){e.preventDefault();go(to.getAttribute('data-tabopen'),to.getAttribute('data-id'));return;}

  var t=e.target.closest('[data-act],[data-go]');
  if(!t)return;
  var act=t.getAttribute('data-act'),id=t.getAttribute('data-id');
  if(act){
    e.preventDefault();e.stopPropagation();
    switch(act){
      case 'rail': railMini=!railMini; DB.uiRail=railMini; renderRail(); Store.save(true); return;
      case 'menu':
        if(DB.uiMode!=='legacy'){toast('The redesigned sidebar is the navigation','');return;}
        menuOpen=!menuOpen; renderMenu(); renderRail(); return;
      case 'focus-find': {
        var ff=document.getElementById('ff');
        if(ff){ff.focus();if(ff.select)ff.select();}
        return;
      }
      case 'ui-mode':
        DB.uiMode=(DB.uiMode==='legacy')?'redesign':'legacy';
        menuOpen=false;
        log('Switched interface',DB.uiMode==='legacy'?'legacy top-bar navigation':'redesigned sidebar');
        toast(DB.uiMode==='legacy'?'Legacy interface':'Redesigned interface','');
        Store.save(true);render();return;
      case 'nav-up': A.navMove(id,-1); return;
      case 'nav-dn': A.navMove(id,1); return;
      case 'rail': railMini=!railMini; DB.uiRail=railMini; Store.save(true); renderRail(); return;
      case 'closetabs': openTabs=[]; go('dashboard'); return;
      case 'refresh': toast('Refreshed',''); render(); return;
      case 'noop': return;
      case 'tabclose-cur':
        openTabs=openTabs.filter(function(x){return x.id!==id;});
        go(openTabs.length?openTabs[0].type:'dashboard',openTabs.length?openTabs[0].id:null);
        return;
      case 'prevrec': case 'nextrec': {
        var ty=t.getAttribute('data-type');
        var pool={candidate:DB.candidates,company:DB.companies,contact:DB.contacts,job:DB.jobs,
          placement:DB.placements,lead:DB.leads,opp:DB.opps,tearsheet:DB.tearsheets}[ty]||[];
        var ix=-1;
        pool.forEach(function(x,i){if(x.id===id)ix=i;});
        if(ix<0)return;
        var nx=act==='prevrec'?ix-1:ix+1;
        if(nx<0||nx>=pool.length){toast(act==='prevrec'?'First record':'Last record','');return;}
        go(ty,pool[nx].id);
        return;
      }
      case 'parse': A.addCandidate(); return;
      case 'coach': coachMini=!coachMini; DB.uiCoach=coachMini; renderCoach(); Store.save(true);
        if(TOUR.active)setTimeout(tourPaint,0); return;
      case 'sort': A.sort(t.getAttribute('data-list'),t.getAttribute('data-key')); return;
      case 'mass-update': A.massUpdate(); return;
      case 'mass-note': A.massNote(); return;
      case 'file-actions': A.fileActions(t.getAttribute('data-cand'),id); return;
      case 'parse-existing': A.parseExisting(t.getAttribute('data-cand'),id); return;
      case 'dash-add': A.dashAdd(); return;
      case 'dash-hide': A.dashHide(id); return;
      case 'cfg-pick': A.cfgPicklist(id); return;
      case 'cfg-req': A.cfgRequired(id,t.getAttribute('data-field')); return;
      case 'cfg-tab-up': A.cfgTabMove(id,t.getAttribute('data-field'),-1); return;
      case 'cfg-tab-dn': A.cfgTabMove(id,t.getAttribute('data-field'),1); return;
      case 'cfg-reset': A.cfgReset(); return;
      case 'parser-toggle':
        DB.parserOverwritePrevention=!DB.parserOverwritePrevention; Store.save(true);
        toast('Overwrite prevention '+(DB.parserOverwritePrevention?'on':'off'),'');
        render(); return;
      case 'peek': A.peek(t.getAttribute('data-type'),id); return;
      case 'peek-tab': PEEK.tab=t.getAttribute('data-tab'); renderPeek(); return;
      case 'peek-close': A.peekClose(); return;
      case 'peek-open': { var pt=t.getAttribute('data-type'); A.peekClose(); go(pt,id); return; }
      case 'funnel': jobFunnel=id; render(); return;
      case 'stage-open': A.stageOpen(id); return;
      case 'sel': A.toggleSel(id); return;
      case 'sel-none':
        if(route.view==='search')searchSel={};else candSel={};
        render(); return;
      case 'sel-all':
        A.selectAll(String(t.getAttribute('data-ids')||'').split(',').filter(Boolean),
          t.getAttribute('data-on')==='1');
        return;
      case 'job-search': A.jobSearch(id); return;
      case 'match-job': A.matchJob(id); return;
      case 'addnew': A.addNew(); return;
      case 'notifs': A.notifs(); return;
      case 'permissive':
        DB.permissive=!DB.permissive; Store.save(true);
        toast(DB.permissive?'Permissive mode — rules warn and can be overridden'
          :'Strict mode — rules block the save',DB.permissive?'':'ok');
        render(); return;
      case 'training':
        DB.training=(DB.training===false);
        if(DB.training===false)coachMini=true;
        DB.uiCoach=coachMini; Store.save(true);
        toast(DB.training===false?'Training mode off \u2014 plain ATS':'Training mode on',
          DB.training===false?'':'ok');
        render(); return;
      case 'email': A.email({to:t.getAttribute('data-to')||'candidate',
        candidateId:t.getAttribute('data-cid')||'',contactId:t.getAttribute('data-ctid')||'',
        jobId:t.getAttribute('data-jid')||'',subId:t.getAttribute('data-sid')||'',
        template:t.getAttribute('data-tpl')||''}); return;
      case 'actions': A.actions(t.getAttribute('data-type'),id); return;
      case 'add-lead': A.addLead(); return;
      case 'convert-lead': A.convertLead(id); return;
      case 'add-opp': A.addOpp(id); return;
      case 'convert-opp': A.convertOpp(id); return;
      case 'add-company': A.addCompany(); return;
      case 'add-contact': A.addContact(id); return;
      case 'add-job': A.addJob(id); return;
      case 'publish': A.publishJob(id); return;
      case 'job-status': A.setJobStatus(id); return;
      case 'add-candidate': A.addCandidate(id); return;
      case 'pipeline-add': A.addToPipeline(id,t.getAttribute('data-cand')); return;
      case 'sub': A.openSub(id); return;
      case 'approve-pl': A.approvePlacement(id); return;
      case 'onboard': A.toggleOnboard(id,t.getAttribute('data-key')); return;
      case 'time-add': A.addTime(id); return;
      case 'time-decide': A.decideTime(id); return;
      case 'note': A.addNote({candidateId:t.getAttribute('data-candidateid')||'',
        contactId:t.getAttribute('data-contactid')||'',companyId:t.getAttribute('data-companyid')||'',
        jobId:t.getAttribute('data-jobid')||''}); return;
      case 'add-tearsheet': A.addTearsheet(); return;
      case 'tearsheet-add': A.addToTearsheet(id); return;
      case 'add-task': A.addTask(); return;
      case 'edit-candidate': A.editCandidate(id); return;
      case 'edit-company': A.editCompany(id); return;
      case 'edit-contact': A.editContact(id); return;
      case 'edit-job': A.editJob(id); return;
      case 'edit-lead': A.editLead(id); return;
      case 'edit-opp': A.editOpp(id); return;
      case 'edit-placement': A.editPlacement(id); return;
      case 'edit-tearsheet': A.editTearsheet(id); return;
      case 'edit-task': A.editTask(id); return;
      case 'edit-note': A.editNote(id); return;
      case 'tearsheet-remove': A.removeFromTearsheet(id,t.getAttribute('data-cand')); return;
      case 'upload-cv': A.uploadCV(id); return;
      case 'run-search': A.runSearch(document.getElementById('bs-q')?document.getElementById('bs-q').value:searchQ); return;
      case 'try-search': A.runSearch(t.getAttribute('data-q')); return;
      case 'clear-search': searchQ=''; searchRun=null; searchSel={}; render(); return;
      case 'save-search': A.saveSearch(); return;
      case 'del-search': A.deleteSearch(id); return;
      case 'sel': searchSel[id]=!searchSel[id]; render(); return;
      case 'mass-tearsheet': A.massTearsheet(); return;
      case 'mass-pipeline': A.massPipeline(); return;
      case 'cand-page': candPage=Number(id)||1; render(); return;
      case 'cand-clear': candFilter=''; candCat='All'; candStatus='All'; candCV='All'; candPage=1;
        candSel={}; render(); return;
      case 'db-save': Store.save(true); toast(Store.available?'Saved':'No local database available',Store.available?'ok':'no'); return;
      case 'db-export': A.dbExport(); return;
      case 'db-import': A.dbImport(); return;
      case 'db-clear': A.dbClear(); return;
      case 'db-reload': A.dbReload(); return;
      case 'task': A.toggleTask(id); return;
      case 'review': A.review(); return;
      case 'assess': A.assess(); return;
      case 'session': vSession(); return;
      case 'tour': tourStart(); return;
      case 'toggle-coach': coachMini=!coachMini; renderCoach(); return;
      case 'reset':
        openForm({title:'Reset all data',
          intro:'Everything goes back to the starting position, and the stored copy in this browser is overwritten. Export from the Database screen first if you need to keep this work.',
          fields:[{k:'ack',label:'Reset the sandbox to its starting state',type:'check',required:true}],
          submit:'Reset',
          onSubmit:function(){
            DB=seed();SEEN={reports:false};openTabs=[];Store.markAllCV();
            searchQ='';searchRun=null;searchSel={};
            candPage=1;candFilter='';candCat='All';candStatus='All';candCV='All';
            Store.save(true);go('dashboard');toast('Sandbox reset','ok');}});
        return;
    }
  }
  var v=t.getAttribute('data-go');
  if(v){
    e.preventDefault();
    var rt=t.getAttribute('data-rtab');
    if(rt)go(v,id,rt); else go(v,id);
  }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&PEEK.id){A.peekClose();return;}
  if(e.key==='Escape'&&document.querySelector('#ff-res').innerHTML){
    document.querySelector('#ff-res').innerHTML='';return;}
  if(e.key!=='Enter'&&e.key!==' ')return;
  var t=e.target.closest('[data-act],[data-go],[data-tabclose],[data-tabopen]');
  if(!t||t.tagName==='BUTTON'||t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA')return;
  e.preventDefault();t.click();
});
document.addEventListener('change',function(e){
  if(e.target.matches('[data-scenario]')){activeScenario=e.target.value;renderCoach();}
  if(e.target.matches('[data-desk]')){
    DB.desk=e.target.value;
    log('Selected a desk type',(DESKS[DB.desk]||{}).t||DB.desk);
    Store.save(true);render();
  }
  var lf=e.target.getAttribute&&e.target.getAttribute('data-listfilter');
  if(lf){
    if(lf==='cat')candCat=e.target.value;
    if(lf==='status')candStatus=e.target.value;
    if(lf==='cv')candCV=e.target.value;
    candPage=1;render();
  }
});
document.addEventListener('input',function(e){
  if(e.target.id==='bs-q')searchQ=e.target.value;
});
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){
    e.preventDefault();
    var f=document.getElementById('ff');
    if(f){f.focus();if(f.select)f.select();}
    return;
  }
  if(e.key!=='Enter')return;
  if(e.target.id==='bs-q'){e.preventDefault();A.runSearch(e.target.value);return;}
  if(e.target.id==='cand-filter'){e.preventDefault();candFilter=e.target.value;candPage=1;candFocus=true;render();}
});
document.getElementById('ff').addEventListener('input',function(e){fastFind(e.target.value);});
window.addEventListener('resize',function(){if(TOUR.active)tourPaint();});
window.addEventListener('scroll',function(){if(TOUR.active)tourPaint();},true);
document.addEventListener('mousedown',function(e){
  if(!e.target.closest('.ff'))document.getElementById('ff-res').innerHTML='';
});

/* If anything throws before the first render completes, say so on the page. A blank screen
   tells nobody anything. */
function bootFail(where,err){
  try{
    var m=document.getElementById('main');
    if(!m||m.getAttribute('data-booted')==='1')return;
    var msg=String((err&&err.stack)||(err&&err.message)||err||'unknown error');
    m.innerHTML='<div style="padding:24px 20px;font-family:var(--sans,Arial);max-width:70em">'+
      '<h2 style="margin:0 0 8px;font-size:19px;color:#9E3823">The practice environment '+
      'failed to start</h2>'+
      '<p style="margin:0 0 12px;font-size:14px;color:#5A6875">It stopped while '+esc(where)+
      '. The detail below is what to send on if you need help.</p>'+
      '<pre style="background:#F7F8F9;border:1px solid #DCE1E6;border-radius:4px;padding:12px;'+
      'font-size:11.5px;line-height:1.5;overflow:auto;white-space:pre-wrap">'+esc(msg)+'</pre>'+
      '<p style="margin:12px 0 0;font-size:13.5px;color:#5A6875">Saved data from an older build '+
      'is the usual cause. <b>Reset all data</b> at the top right, or clear this site\u2019s '+
      'storage in your browser, then reload.</p></div>';
  }catch(e){
    try{document.getElementById('main').textContent='The practice environment failed to start: '+e;}catch(x){}
  }
}
window.addEventListener('error',function(ev){bootFail('running',ev.error||ev.message);});
window.addEventListener('unhandledrejection',function(ev){bootFail('loading saved data',ev.reason);});

try{ render(); }catch(e){ bootFail('drawing the first screen',e); }

Store.init().then(function(rec){
  if(rec&&rec.data&&rec.data.candidates){
    DB=rec.data;
    if(rec.seq)SEQ=rec.seq;
    ['leads','opps','companies','contacts','candidates','jobs','subs','appts','placements',
     'times','notes','tasks','tearsheets','savedSearches','audit'].forEach(function(k){
      if(!DB[k])DB[k]=[];});
    Store.lastSaved=rec.savedAt||null;
    /* Datasets saved by an earlier build carry resume text inline. Resumes now live in their
       own store, so those have to be moved across before the next save strips them. */
    var inlineCVs=DB.candidates.some(function(c){return !!c.cv;});
    Store.hydrateCVs().then(function(n){
      if(inlineCVs||!n)Store.markAllCV();
      if(n)render();
      Store.save(true);
      /* A dataset from before the pool was expanded looks broken rather than old, so say so. */
      var expected=0;
      Object.keys(VERTICALS).forEach(function(k){expected+=VERTICALS[k].n;});
      if(DB.candidates.length<expected*0.5){
        notify('Your saved data is from an earlier build \u2014 '+DB.candidates.length+
          ' candidates rather than about '+expected+'. Reset all data to load the current pool.',
          'candidates',null);
        toast(DB.candidates.length+' candidates loaded from an earlier build \u2014 reset to get the full pool','no');
      }
    });
    if(typeof DB.uiRail==='boolean')railMini=DB.uiRail;
    if(typeof DB.uiCoach==='boolean')coachMini=DB.uiCoach;
    render();
    toast('Restored your saved data from '+fmtDT(rec.savedAt||new Date()),'ok');
    if(!DB.tourSeen)tourWelcome();
  } else {
    render();
    if(Store.available){Store.markAllCV();Store.save(true);}
    if(!DB.tourSeen)tourWelcome();
  }
}).catch(function(err){
  /* Saved data that cannot be read must not take the whole application down. */
  try{
    if(document.getElementById('main').getAttribute('data-booted')!=='1')render();
    toast('Saved data could not be read, so the sandbox started fresh','no');
    log('Saved data could not be read',String(err&&err.message||err));
  }catch(e){bootFail('recovering from unreadable saved data',e);}
  if(!DB.tourSeen)tourWelcome();
});
})();
