// v10.62.0 — shared by v62-digital-bar and no-ai-words (not a suite itself): made-up findings in the shape digital-read-1.2 gives
// (DESIGN-DIGITAL-2.md, Part 1: site.pages[], videos[], stale[], forms, pics, home, words[], email, address, map, latestVideo;
// youtube.subscribers / about / aboutSite / desc / upcoming / names / weak / recent; google.photos), a made-up in-depth review in the
// record_review shape (Part 3), and a stub of the digital function (GET; POST read · again · review · review-status).
// Every church, pastor and address is made up: the repository is public.
const site62=(o={})=>({listed:'www.x.test',url:'https://www.x.test/',opens:true,https:true,mobile:true,title:'X Seventh-day Adventist Church',pagesRead:['/','/about','/visit'],
  pastors:[],pastorNamed:[],serviceTimes:true,phones:['215-555-0100'],bibleStudy:true,prayerRequest:true,giving:true,visitors:true,expect:true,
  social:{facebook:null,instagram:null,youtube:null,livestream:'https://www.youtube.com/@x/live'},
  pastDate:'2026-10-03',nextDate:'2026-10-17',ahead:2,ms:600,description:true,events:true,sermons:true,pastorPhoto:null,pastorPhotoOn:null,
  pages:[{path:'/',title:'Home',words:420,h1:'Welcome',newest:'2026-10-03',next:'2026-10-17',forms:{n:1,prayer:true,bible:false,contact:false,news:false},videos:1,imgs:{n:4,unnamed:0,generated:0},status:200},
    {path:'/about',title:'About',words:300,h1:'About us',newest:null,next:null,forms:{n:0,prayer:false,bible:false,contact:false,news:false},videos:0,imgs:{n:3,unnamed:0,generated:0},status:200},
    {path:'/visit',title:'Plan your visit',words:260,h1:'Plan your visit',newest:null,next:null,forms:{n:1,prayer:false,bible:false,contact:true,news:false},videos:0,imgs:{n:2,unnamed:0,generated:0},status:200}],
  videos:[{id:'v1',on:'/',title:'Sabbath sermon: Rest for the weary',by:'X Seventh-day Adventist Church',date:'2026-10-04',live:false,mine:true,names:[]}],
  stale:[],forms:{n:4,prayer:true,bible:true,contact:true,news:true},pics:{n:12,unnamed:1,generated:0},
  home:{h1:'Welcome',first:'Welcome to X Seventh-day Adventist Church. Sabbath School 9:30, worship 11:00.',ctas:['Plan your visit','Watch live','Ask for prayer'],pics:[{url:'https://www.x.test/a.jpg',alt:'Members greeting a visitor at the door'}]},
  words:[],email:{host:'x.test',generic:false},address:true,map:true,latestVideo:'2026-10-04',...o});
const yt62=(o={})=>({url:'https://www.youtube.com/@x',read:true,latest:{t:'Sabbath sermon: Rest for the weary',d:'2026-10-04',v:80},inFeed:15,last30:4,last90:12,avgViews:90,kinds:{sermon:12,series:3,worship:0,event:0},titles:[],
  subscribers:300,about:'X Seventh-day Adventist Church in Sampleton. Join us Sabbath at 11.',aboutSite:'x.test',desc:{n:15,link:12,address:9,times:8},upcoming:true,
  names:[{name:'Pastor Joshua Mura',n:9}],weak:2,recent:[{t:'Sabbath sermon: Rest for the weary',d:'2026-10-04',v:80},{t:'Prophecy series night 3',d:'2026-09-27',v:75}],...o});
const G62=(o={})=>({read:true,found:true,name:'X Seventh-day Adventist Church',rating:4.7,reviews:38,status:'OPERATIONAL',website:'https://www.x.test/',phone:'(215) 555-0100',maps:'https://maps.google.com/?cid=1',hours:['Saturday: 9:30 AM – 1:00 PM'],photos:6,...o});
const ch62=(o={})=>({org:'ANBZ01',name:'Sampleton SDA Church',kind:'church',town:'Sampleton',state:'PA',address:'10 Main St Sampleton PA 19000',phone:'215-555-0100',pastor:'Joshua Mura',members:120,
  website:'www.x.test',read:'2026-10-08',site:site62(),google:G62(),search:{read:true,ownAt:1},dirPastors:[],facebook:{url:'https://www.facebook.com/x',from:'site',followers:410},instagram:null,youtube:yt62(),...o});
/* the Samples' Sampleton: a site that opens but fails many marks (a stale newsletter, an embedded video naming "Pastor Sample Previous"
   from 2023, no forms, a generated hero picture, the name written "Seventh-Day", "All Rights Served", a Gmail address, no description) */
const SAMPLETON=()=>ch62({org:'ANBZ01',name:'Sampleton SDA Church',members:120,
  site:site62({title:'Sampleton Seventh-Day Adventist Church',pastors:[{name:'Josh Mura',former:false,pages:['/our-staff']}],pastorNamed:['/our-staff'],
    pastDate:'2023-07-02',nextDate:null,ahead:0,ms:2900,description:false,events:false,sermons:false,visitors:false,expect:false,prayerRequest:false,bibleStudy:true,
    social:{facebook:'https://www.facebook.com/sampleton',instagram:null,youtube:'https://www.youtube.com/@sampleton',livestream:'https://www.facebook.com/sampleton/live'},
    pages:[{path:'/',title:'Home',words:180,h1:'',newest:null,next:null,forms:{n:0,prayer:false,bible:false,contact:false,news:false},videos:1,imgs:{n:6,unnamed:5,generated:1},status:200},
      {path:'/our-staff',title:'Our staff',words:120,h1:'Our staff',newest:null,next:null,forms:{n:0,prayer:false,bible:false,contact:false,news:false},videos:0,imgs:{n:1,unnamed:1,generated:0},status:200},
      {path:'/newsletter',title:'Newsletter',words:90,h1:'Newsletter',newest:'2023-07-02',next:null,forms:{n:0,prayer:false,bible:false,contact:false,news:false},videos:0,imgs:{n:0,unnamed:0,generated:0},status:200},
      {path:'/bible-studies',title:'Bible studies',words:60,h1:'Bible studies',newest:null,next:null,forms:{n:0,prayer:false,bible:false,contact:false,news:false},videos:0,imgs:{n:0,unnamed:0,generated:0},status:200},
      {path:'/calendar',title:'Calendar',words:0,h1:'',newest:null,next:null,forms:{n:0,prayer:false,bible:false,contact:false,news:false},videos:0,imgs:{n:0,unnamed:0,generated:0},status:404}],
    videos:[{id:'old1',on:'/',title:'Sabbath Worship with Pastor Sample Previous',by:'Sampleton SDA',date:'2023-06-03',live:false,mine:true,names:['Sample Previous']}],
    stale:[{path:'/newsletter',date:'2023-07-02'}],forms:{n:0,prayer:false,bible:false,contact:false,news:false},pics:{n:7,unnamed:6,generated:1},
    home:{h1:'',first:'Sampleton Seventh-Day Adventist Church. Sabbath School 9:30 AM. Worship 11:00 AM.',ctas:['Gallery','Newsletter','Bible studies','Give'],pics:[{url:'https://www.x.test/ChatGPT_Image_Jun_11_2026.png',alt:'ChatGPT Image Jun 11, 2026'},{url:'https://www.x.test/gallery1.jpg',alt:'gallery1.jpg'}]},
    words:[{t:'Seventh-Day Adventist',on:'/'},{t:'All Rights Served',on:'/'}],email:{host:'gmail.com',generic:true},address:true,map:false,latestVideo:'2023-06-03'}),
  google:G62({name:'Sampleton Seventh-day Adventist Church',hours:[],photos:2}),
  youtube:yt62({latest:{t:'Sabbath sermon: The open door',d:'2026-10-04',v:120},inFeed:15,last30:15,last90:40,avgViews:120,subscribers:1130,kinds:{sermon:13,series:0,worship:2,event:0},weak:3,upcoming:true,desc:{n:15,link:15,address:14,times:12},names:[{name:'Pastor Joshua Mura',n:11}]}),
  facebook:{url:'https://www.facebook.com/sampleton',from:'site',followers:900}});
const FIND62=()=>({v:1,fn:'digital-read-1.2',conf:'Pennsylvania',org:'ANBI11',read:'2026-10-08',at:Date.parse('2026-10-08T12:00:00Z'),places:true,search:true,churches:[
  SAMPLETON(),
  // his other church: every mark met
  ch62({org:'ANBZ02',name:'Brookfield SDA Church',town:'Brookfield',website:'www.brook.test',site:site62({listed:'www.brook.test',url:'https://www.brook.test/',pastors:[{name:'Joshua Mura',former:false,pages:['/pastor'],photo:'near',photoOn:'/pastor'}],pastorNamed:['/pastor'],pastorPhoto:'near',pastorPhotoOn:'/pastor'}),google:G62({website:'https://www.brook.test/'})}),
  // another church whose site opens and fails every mark it can (the "Website up, but not working" box)
  ch62({org:'ANBZ03',name:'Allfail SDA Church',town:'Allfail',pastor:'Ann Lee',members:80,phone:'610-555-0200',website:'allfail.test',
    site:site62({listed:'allfail.test',url:'http://allfail.test/',https:false,mobile:false,title:'Allfail Seventh Day Adventist',pastors:[{name:'Ed Olsen',former:false,pages:['/about']}],pastorNamed:[],serviceTimes:false,phones:['484-555-0999'],bibleStudy:false,prayerRequest:false,giving:false,visitors:false,expect:false,
      social:{facebook:null,instagram:null,youtube:null,livestream:null},pastDate:'2022-01-10',nextDate:null,ahead:0,ms:7200,description:false,events:false,sermons:false,pastorPhoto:null,
      pages:[{path:'/',title:'Home',words:50,h1:'',newest:'2022-01-10',next:null,forms:{n:0,prayer:false,bible:false,contact:false,news:false},videos:0,imgs:{n:3,unnamed:3,generated:2},status:200},{path:'/events',title:'Events',words:0,h1:'',newest:null,next:null,forms:{n:0,prayer:false,bible:false,contact:false,news:false},videos:0,imgs:{n:0,unnamed:0,generated:0},status:404}],
      videos:[],stale:[{path:'/',date:'2022-01-10'}],forms:{n:0,prayer:false,bible:false,contact:false,news:false},pics:{n:3,unnamed:3,generated:2},
      home:{h1:'',first:'Allfail Seventh Day Adventist',ctas:[],pics:[]},words:[{t:'Seventh Day Adventist',on:'/'},{t:'recieve',on:'/'}],email:{host:'yahoo.com',generic:true},address:false,map:false,latestVideo:null}),
    google:G62({name:'Allfail SDA',website:'https://www.other.test/',phone:'(484) 555-0111',hours:[],reviews:2,rating:3.5,photos:1}),
    youtube:yt62({latest:{t:'Worship Service || Jan 10, 2026',d:'2026-01-10',v:12},inFeed:15,last30:0,last90:0,avgViews:12,kinds:{sermon:0,series:0,worship:15,event:0},subscribers:20,aboutSite:null,desc:{n:15,link:0,address:0,times:0},upcoming:false,names:[],weak:15}),
    facebook:null,search:{read:true,ownAt:null}}),
  // read by the older reader (digital-read-1.0): no pages, dates, forms, pictures, words… every such mark null
  ch62({org:'ANBZ04',name:'Olden SDA Church',town:'Olden',pastor:'Carl Day',members:60,site:(()=>{ const s=site62({pastors:[{name:'Carl Day',pages:['/about']}],pastorNamed:['/about']});
    ['pastDate','nextDate','ahead','ms','description','events','sermons','pastorPhoto','pastorPhotoOn','pages','videos','stale','forms','pics','home','words','email','address','map','latestVideo','expect'].forEach(k=>delete s[k]); return s; })(),
    google:(()=>{ const g=G62(); delete g.photos; return g; })(),youtube:(()=>{ const y=yt62(); ['subscribers','about','aboutSite','desc','upcoming','names','weak','recent'].forEach(k=>delete y[k]); return y; })()}),
  // no website anywhere; nothing on Google
  ch62({org:'ANBZ05',name:'Nosite SDA Company',kind:'company',town:'Nosite',pastor:'Dee Fox',members:null,website:'nosite.test',site:{listed:'nosite.test',opens:false,refused:false,status:0},google:G62({found:false,name:null}),facebook:null,youtube:null,search:{read:true,ownAt:null}}),
]});
const REVIEW62=()=>({
  sees:'A visitor lands on a slideshow of photographs with no welcome and no way to ask anything. The service times are there; the pastor is not. The newest words on the site are from 2023.',
  strengths:[{what:'Service times on the first screen',where:'home page'},{what:'The channel posts every week with the address in each description',where:'YouTube'},{what:'Bible studies are offered',where:'bible-studies page'}],
  gaps:[{area:'pastor',title:'A previous pastor on the home page',what:'The home page video is “Sabbath Worship with Pastor Sample Previous”, from June 2023.',why:'A visitor meets someone who is no longer here.',fix:'Replace the video with this month’s sermon and add a short welcome from the pastor, with a recent photo.',who:'Media team',effort:'day',priority:1},
    {area:'reach',title:'No way to ask on the site',what:'“Bible studies” is three links to other sites; there is no prayer request.',why:'A neighbor who wants to ask has to leave the site.',fix:'Add two short forms: Ask for prayer, and Request Bible studies (name, phone or email, what you would like).',who:'Webmaster',effort:'hour',priority:1},
    {area:'website',title:'A newsletter from 2023',what:'The newsletter page’s last issue is dated “July 2, 2023”.',why:'It says the church stopped.',fix:'Take the page down, or post this quarter’s issue.',who:'Webmaster',effort:'hour',priority:2},
    {area:'google',title:'No hours on Google',what:'Google shows the church with no hours.',why:'A visitor cannot tell when to come.',fix:'Add the Sabbath hours in the Google Business Profile.',who:'Communication leader',effort:'hour',priority:2},
    {area:'youtube',title:'Titles that say only the date',what:'Three titles read “Sabbath Service” and a date.',why:'Nobody searches for a date.',fix:'Give each video a title that says the topic.',who:'Media team',effort:'hour',priority:3}],
  pictures:[{on:'home page',shows:'A slideshow of worship photographs and one drawn picture of a church building',note:'The drawn picture looks generated; the photographs are real but undescribed.'}],
  appeal:{level:1,note:'A welcome line on the staff page; no invitation to a visit, a study or prayer.'},
  pastor:{shown:'no',note:'The pastor of record is named on the staff page without a photo; the home page video shows another.'},
  words:[{for:'welcome',text:'Welcome to Sampleton Seventh-day Adventist Church. Whoever you are, you are welcome here this Sabbath.'},{for:'visit',text:'Plan your visit: Sabbath School at 9:30, worship at 11:00. Free parking behind the church; children are welcome in the service.'},{for:'prayer',text:'How can we pray for you? Write a line below; a member of our prayer team will pray this week.'}],
  made:'2026-10-08',model:'claude-opus-5-5'});
/* the stub: opts.review = 'kept' (200 at once) | 'job' (202, then running, then done) | 'failed' (202, then failed) | 'locked' (401 locked) |
   'limit' (429) | 'busy' (409 once, then kept) | 'off' (the GET says review:false); opts.findings; calls recorded */
function dfFetch62(P,opts){
  opts=opts||{}; const f0=P.w.fetch, calls=[]; let state=opts.state||'ready', polls=0, busy=0;
  const R=()=>JSON.parse(JSON.stringify(opts.reviewObj||REVIEW62()));
  P.w.fetch=async(u,o)=>{ u=String(u); if(!/\/\.netlify\/functions\/digital/.test(u)) return f0(u,o);
    const call={u,method:(o&&o.method)||'GET',body:o&&o.body?JSON.parse(o.body):null,reg:o&&o.headers&&o.headers['x-terrain-reg']}; calls.push(call);
    if(opts.status) return {ok:false,status:opts.status,json:async()=>({ok:false,code:'noreg'})};
    if(call.method==='POST'){ const b=call.body;
      if(b.op==='review'){ const rv=opts.review||'kept';
        if(rv==='locked') return {ok:false,status:401,json:async()=>({ok:false,code:'locked'})};
        if(rv==='limit') return {ok:false,status:429,json:async()=>({ok:false,code:'limit-reg'})};   // integration: the server's own code (digital-1.2: limit-reg / limit-site)
        if(rv==='busy'&&!busy++) return {ok:false,status:409,json:async()=>({ok:false,code:'busy'})};
        if(rv==='kept'||rv==='busy') return {ok:true,status:200,json:async()=>({ok:true,review:R()})};
        polls=0; return {ok:true,status:202,json:async()=>({ok:true,job:'job-'+b.org})}; }
      if(b.op==='review-status'){ polls++; const rv=opts.review||'kept';
        if(polls<2) return {ok:true,status:200,json:async()=>({ok:true,status:'running'})};
        if(rv==='failed') return {ok:true,status:200,json:async()=>({ok:true,status:'failed',code:'rejected'})};
        return {ok:true,status:200,json:async()=>({ok:true,status:'done',review:R()})}; }
      if(b.op==='read') state='reading';
      return {ok:true,status:b.op==='again'&&opts.limit?429:202,json:async()=>({ok:true,state:'reading'})}; }
    const body={ok:true,fn:'digital-1.2',conf:'Pennsylvania',supported:true,enabled:opts.enabled!==false,places:true,search:true,review:opts.review!=='off'};
    if(state==='ready') Object.assign(body,{state:'ready',findings:JSON.parse(JSON.stringify(opts.findings||FIND62())),reading:null});
    else if(state==='reading') Object.assign(body,{state:'reading',findings:null,reading:{phase:'read',done:40,total:129}});
    else Object.assign(body,{state:'none',findings:null,reading:null});
    return {ok:true,status:200,json:async()=>body}; };
  return calls;
}
module.exports={site62,yt62,G62,ch62,SAMPLETON,FIND62,REVIEW62,dfFetch62};
