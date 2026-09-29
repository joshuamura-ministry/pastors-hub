/* Sample decks for the slide renderer demo.
   Figures come from tests/fixtures.json (fabricated test data): tract
   2041.02 against Bucks County, and the MEDIUM church. The Pathfinder club's
   needs (5 volunteers, 1 leader, 50 first-month hours, $125, 16 places,
   6 weeks) are uReq's defaults for that ministry with this church. The
   margins of error are illustrative: the fixture carries no _M values.
   Scripture: KJV and RVA 1909, verbatim from Bible Gateway. Ellen White
   lines are the ones verified in R-persuade.md (PK 638); the Spanish decks
   leave the EGW line out until the Spanish text is checked on
   egwwritings.org. */
const FIX={
  tract:{name:'Census Tract 2041.02',pop:5480,hh:1980,kids:1490,kidsShare:27.2,singleParent:34.5,poverty:19.4,noCar:13.5,service:28,spanish:19.4},
  county:{name:'Bucks County',kidsShare:20.4,singleParent:19,poverty:7.1,noCar:4.9},
  church:{name:'Bucks County SDA',members:135,volunteers:46,busyVolunteers:11,leaders:9,busyLeaders:2,hours:320,busyHours:70,startupBudget:2500,monthlyBudget:450},
  need:{volunteers:5,leaders:1,hours:50,cost:125,places:16,weeks:6},
  gifts:{took:23,fit:9,drawn:6}
};
const oneIn=p=>Math.round(100/p);
const pct=p=>String(Math.round(p));
const n$=v=>v.toLocaleString('en-US');

function demoDecks(){
  const T=FIX.tract, C=FIX.county, CH=FIX.church, N=FIX.need, G=FIX.gifts;
  const free={v:CH.volunteers-CH.busyVolunteers, l:CH.leaders-CH.busyLeaders, h:CH.hours-CH.busyHours};
  const room='q7Rk2mWx9TzA4bLp0sVn3E';
  const join=(es)=>({type:'join',qrUrl:'https://pastorshub.org/#watch='+room+(es?'~es':''),code6:'K7M2QX',note:es?'Sin aplicación y sin registrarse':'No app, no sign-in'});
  const base=(lang,type,group,title)=>({kind:'tdeck',ver:1,lang,title,church:CH.name,audience:{type,group},ministry:{id:'pathfinders',name:'Pathfinder & Adventurer club'},created:'2026-09-28',slides:[]});
  const kidsStat=(es,kicker,headline)=>({type:'stat',kicker,headline,
    value:pct(T.kidsShare),unit:'%',hue:'children',
    freq:es?`cerca de 1 de cada ${oneIn(T.kidsShare)}`:`about 1 in ${oneIn(T.kidsShare)}`,
    count:es?`unos ${n$(T.kids)} niños en nuestro sector censal`:`about ${n$(T.kids)} children in our census tract`,
    dots:{n:100,on:Math.round(T.kidsShare),hue:'children'},
    compare:{here:T.kidsShare,county:C.kidsShare,label:es?'Condado de Bucks':'Bucks County',hereLabel:es?'Nuestro sector':'Our tract',sig:true,moe:3.1},
    source:es?'Censo de EE. UU., ACS 2020–2024 · Sector censal 2041.02':'U.S. Census ACS 2020–2024 · Census Tract 2041.02'});
  const capacity=(es,kicker,headline)=>({type:'capacity',kicker,headline,
    rows:[{label:es?'Voluntarios':'Volunteers',need:N.volunteers,have:free.v,unit:''},
          {label:es?'Líderes':'Leaders',need:N.leaders,have:free.l,unit:''},
          {label:es?'Horas del primer mes':'Hours in month one',need:N.hours,have:free.h,unit:'h'},
          {label:es?'Presupuesto inicial':'Start-up budget',need:N.cost,have:CH.startupBudget,unit:'$'}],
    gaps:[],
    source:es?'Perfil de la iglesia, revisado el 21 de sept. · después de los ministerios ya elegidos':'Church profile, reviewed 21 Sep · after the ministries already chosen'});
  const ability=(es,kicker,headline,lead)=>({type:'ability',kicker,headline,value:String(G.fit),
    label:es?`miembros tienen dones para trabajar con niños, y ${G.drawn} de ellos dicen sentirse llamados a ello.`:`members’ gifts fit work with children, and ${G.drawn} of them said they are drawn to it.`,
    gifts:es?['Enseñanza','Pastoreo y cuidado pastoral','Exhortación y ánimo','Ayudas']:['Teaching','Shepherding and pastoral care','Encouragement and exhortation','Helps'],
    lead,
    source:es?`Dones Espirituales de ${G.took} miembros · solo cifras, sin nombres`:`Spiritual Gifts results from ${G.took} members · counts only, no names`});
  const V={
    luke:{en:{text:'For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?',ref:'Luke 14:28 · KJV'},
          es:{text:'Porque ¿cuál de vosotros, queriendo edificar una torre, no cuenta primero sentado los gastos, si tiene lo que necesita para acabarla?',ref:'Lucas 14:28 · RVA'}},
    neh:{en:{text:'And they said, Let us rise up and build. So they strengthened their hands for this good work.',ref:'Nehemiah 2:18',version:'KJV'},
         es:{text:'Y dijeron: Levantémonos, y edifiquemos. Así esforzaron sus manos para bien.',ref:'Nehemías 2:18',version:'RVA'}},
    pet:{en:{text:'As every man hath received the gift, even so minister the same one to another, as good stewards of the manifold grace of God.',ref:'1 Peter 4:10 · KJV'},
         es:{text:'Cada uno según el don que ha recibido, adminístrelo á los otros, como buenos dispensadores de las diferentes gracias de Dios.',ref:'1 Pedro 4:10 · RVA'}},
    pk638:{text:'Nehemiah asked the people directly whether they would take advantage of this opportunity and arise and build the wall.',ref:'Ellen G. White · Prophets and Kings, p. 638'},
    pk6383:{text:'Each man became a Nehemiah in his turn and helped to make stronger the heart and hand of his neighbor.',ref:'Ellen G. White · Prophets and Kings, p. 638'}
  };

  /* ---- A. Church board: the decision deck ---- */
  const board=lang=>{ const es=lang==='es'; const d=base(lang,'board','board',es?'Club de Conquistadores y Aventureros, abierto al vecindario':'A Pathfinder & Adventurer club, open to the neighborhood');
    d.slides=[
      join(es),
      {type:'motion',kicker:es?'La moción':'The motion',
       headline:es?'Aprobar una prueba de seis semanas de un club de Conquistadores y Aventureros, abierto al vecindario':'Approve a six-week trial of a Pathfinder & Adventurer club, open to the neighborhood',
       rows:es?[['Fechas','7 oct. – 18 nov.'],['Plazas',`${N.places} niños`],['Tope de gasto','$125'],['De dónde','Presupuesto local, no diezmo'],['Revisión','Junta del 18 nov.']]
              :[['Runs','7 Oct – 18 Nov'],['Places',`${N.places} children`],['Spending ceiling','$125'],['Paid from','Local budget, not tithe'],['Review','18 Nov board meeting']],
       by:es?'Preparado por el pastor Joshua Mura · 28 sept. 2026':'Prepared by Pastor Joshua Mura · 28 Sep 2026'},
      kidsStat(es,es?'La necesidad':'The need',es?'Más de 1 de cada 4 vecinos es un niño':'More than 1 in 4 people around us is a child'),
      {type:'trio',kicker:es?'Por qué aquí':'Why here',headline:es?'Las familias de nuestro alrededor cargan más que la mayoría':'The families around us carry more than most',
       items:es?[{value:`1 de ${oneIn(T.singleParent)}`,label:`familias con hijos tiene un solo padre o madre. Condado: 1 de ${oneIn(C.singleParent)}.`,hue:'children'},
                 {value:`1 de ${oneIn(T.poverty)}`,label:`personas vive bajo el umbral de pobreza. Condado: 1 de ${oneIn(C.poverty)}.`,hue:'hardship'},
                 {value:`${T.service}%`,label:'trabaja en servicios, a menudo de noche y en fines de semana: el horario se adapta a ellos.',hue:'hardship'}]
               :[{value:`1 in ${oneIn(T.singleParent)}`,label:`families with children has one parent. County: 1 in ${oneIn(C.singleParent)}.`,hue:'children'},
                 {value:`1 in ${oneIn(T.poverty)}`,label:`people live below the poverty line. County: 1 in ${oneIn(C.poverty)}.`,hue:'hardship'},
                 {value:`${T.service}%`,label:'work service jobs, often evenings and weekends: we plan the timing around them.',hue:'hardship'}],
       source:es?'ACS 2020–2024 · Sector 2041.02 frente al condado de Bucks':'ACS 2020–2024 · Tract 2041.02 against Bucks County'},
      capacity(es,es?'Capacidad':'Capacity',es?'Podemos atenderlo sin agotar a nadie':'We can staff it without stretching anyone'),
      ability(es,es?'Quién puede':'Who is able',es?'Dios ya puso en nuestra iglesia a las personas para esto':'God has already put the people for this in our church',
        es?'un miembro está listo para coordinar':'one member is ready to coordinate'),
      {type:'ask',kicker:es?'Lo que pedimos':'The ask',headline:es?'Exactamente lo que pedimos a la junta':'Exactly what we are asking the board for',
       rows:es?[['Personas','1 coordinador · 4 ayudantes'],['Lugar','Aulas · martes 6:30 p. m.'],['Materiales y especialidades','$85'],['Meriendas, 6 semanas','$40'],['De dónde','Presupuesto local, no diezmo'],['Queda después','$2,375']]
              :[['People','1 coordinator · 4 helpers'],['Room','Classrooms · Tue 6:30 pm'],['Supplies & honours','$85'],['Snacks, 6 weeks','$40'],['Paid from','Local budget, not tithe'],['Left after this','$2,375']],
       verse:V.luke[lang]},
      {type:'risks',kicker:es?'Riesgos':'Risks',headline:es?'Las preguntas que usted haría, ya respondidas':'The questions you would ask, already answered',
       items:es?['Cada voluntario adulto verificado (Adventist Screening Verification)','Dos adultos en cada sala, con la puerta abierta','Consultado el director de jóvenes de la Asociación','Sin choques con el calendario de la iglesia','Meriendas preparadas con normas de higiene']
               :['Every adult volunteer screened (Adventist Screening Verification)','Two adults in every room, door open','Conference youth director consulted','No clash with the church calendar','Snacks prepared under food-safety guidelines'],
       source:es?'Manual de la Iglesia 2022, Notas 8 · NAD ASV':'Church Manual 2022, Notes 8 · NAD ASV'},
      {type:'timeline',kicker:es?'Primer paso':'First step',headline:es?'Seis semanas, y luego una revisión honesta':'Six weeks, then an honest review',
       steps:es?[{date:'7 oct.',title:'Primera noche del club',text:'Cada voluntario trae dos invitaciones.'},{date:'28 oct.',title:'Punto medio',text:'Asistencia, quién vuelve, horas frente al plan.'},{date:'18 nov.',title:'Revisión de la junta',text:'Seguir, cambiar o parar. Las tres son buenas respuestas.'}]
               :[{date:'7 Oct',title:'First club night',text:'Each volunteer brings two invitations.'},{date:'28 Oct',title:'Midpoint check',text:'Attendance, return visits, hours against plan.'},{date:'18 Nov',title:'Board review',text:'Continue, change or stop. All three are good outcomes.'}],
       quote:es?null:V.pk638},
      {type:'close',kicker:es?'La decisión':'The decision',headline:es?'¿Aprobará la junta la prueba?':'Will the board approve the trial?',
       text:es?'Aprobarla, aprobarla más pequeña o fijar una fecha para decidir. Cualquiera de las tres nos hace avanzar juntos.':'Approve it, approve it smaller, or set a date to decide. Any of the three moves us forward together.',
       quote:null}
    ]; return d; };

  /* ---- B. Ministry team: the invitation deck ---- */
  const team=lang=>{ const es=lang==='es'; const d=base(lang,'team','pathfinder-staff',es?'Un club para los niños de nuestro vecindario':'A club for the children around us');
    d.slides=[
      join(es),
      {type:'close',kicker:es?'Personal de Conquistadores':'Pathfinder staff',headline:es?'Ustedes son las personas que esto necesita':'You are the people this needs',
       text:es?'Un club de Conquistadores y Aventureros, abierto a los niños de las calles alrededor de nuestra iglesia.':'A Pathfinder & Adventurer club, open to the children in the streets around our church.',
       quote:V.pet[lang]},
      kidsStat(es,es?'A quiénes serviríamos':'Who we would serve',es?`Unos ${n$(T.kids)} niños viven a nuestro alrededor`:`About ${n$(T.kids)} children live around us`),
      {type:'trio',kicker:es?'Por qué el plan es así':'Why the plan looks like this',headline:es?'Tres datos que deciden el horario y el transporte':'Three facts that set the timing and the rides',
       items:es?[{value:`${T.service}%`,label:'trabaja en servicios, de noche y en fines de semana: el club es el martes a las 6:30.',hue:'hardship'},
                 {value:`1 de ${oneIn(T.noCar)}`,label:`hogares no tiene auto. Condado: 1 de ${oneIn(C.noCar)}. Organizamos quién los lleva.`,hue:'housing'},
                 {value:`1 de ${oneIn(T.spanish)}`,label:'vecinos habla español en casa: las invitaciones van en los dos idiomas.',hue:'language'}]
               :[{value:`${T.service}%`,label:'work service jobs, evenings and weekends: the club meets Tuesdays at 6:30.',hue:'hardship'},
                 {value:`1 in ${oneIn(T.noCar)}`,label:`homes has no car. County: 1 in ${oneIn(C.noCar)}. We arrange rides.`,hue:'housing'},
                 {value:`1 in ${oneIn(T.spanish)}`,label:'neighbours speak Spanish at home: invitations go out in both languages.',hue:'language'}],
       source:es?'ACS 2020–2024 · Sector 2041.02 frente al condado de Bucks':'ACS 2020–2024 · Tract 2041.02 against Bucks County'},
      ability(es,es?'Ustedes ya tienen lo necesario':'You already have what it takes',es?'Esta iglesia ya tiene los dones que el club necesita':'This church already has the gifts a club needs',
        es?'un miembro está listo para coordinar':'one member is ready to coordinate'),
      {type:'roles',kicker:es?'Los puestos':'The roles',headline:es?'Cuatro puestos, con las horas exactas':'Four roles, with the hours spelled out',
       roles:es?[{title:'Coordinador',hours:'3 h por semana',text:'Planifica cada noche, habla con los padres y lleva la asistencia.'},
                 {title:'Consejeros (2)',hours:'2 h por semana',text:'Cada uno guía a un grupo pequeño en especialidades y en la historia bíblica.'},
                 {title:'Conductor',hours:'1 h por semana',text:'Recoge a los niños cuyas familias no tienen auto.'},
                 {title:'Bienvenida y merienda',hours:'1 h por semana',text:'Recibe a cada familia en la puerta y prepara algo sencillo.'}]
              :[{title:'Coordinator',hours:'3 h a week',text:'Plans each night, talks with parents and keeps the register.'},
                 {title:'Counsellors (2)',hours:'2 h a week',text:'Each guides a small group through honours and the Bible story.'},
                 {title:'Driver',hours:'1 h a week',text:'Brings the children whose families have no car.'},
                 {title:'Welcome & snack',hours:'1 h a week',text:'Meets each family at the door and sets out something simple.'}]},
      {type:'risks',kicker:es?'Cómo le apoyamos':'How you will be supported',headline:es?'Nadie empieza solo ni sin preparación':'Nobody starts alone or untrained',
       items:es?['Capacitación de personal de Conquistadores de la Asociación (un domingo)','Verificación de antecedentes pagada por la iglesia','Cada nuevo ayudante trabaja junto a alguien con experiencia','Dos adultos en cada sala, con la puerta abierta','El pastor revisa con el equipo cada dos semanas']
               :['Conference Pathfinder staff training (one Sunday)','Background screening, paid for by the church','Each new helper paired with someone experienced','Two adults in every room, door open','The pastor meets the team every two weeks'],
       source:es?'Manual de la Iglesia 2022, Notas 8 · NAD ASV':'Church Manual 2022, Notes 8 · NAD ASV'},
      {type:'timeline',kicker:es?'Las primeras seis semanas':'The first six weeks',headline:es?'Un comienzo pequeño, con fecha para evaluar':'A small start, with a date to take stock',
       steps:es?[{date:'30 sept.',title:'Reunión del equipo',text:'Repartimos puestos e invitaciones.'},{date:'7 oct.',title:'Primera noche',text:'Dieciséis plazas, dos adultos por sala.'},{date:'18 nov.',title:'Evaluamos juntos',text:'Qué funcionó, qué cambiar y si seguimos.'}]
               :[{date:'30 Sep',title:'Team evening',text:'We share out the roles and the invitations.'},{date:'7 Oct',title:'First club night',text:'Sixteen places, two adults in every room.'},{date:'18 Nov',title:'We take stock together',text:'What worked, what to change, and whether to go on.'}],
       quote:es?null:{text:'Every church should be a training school for Christian workers.',ref:'Ellen G. White · The Ministry of Healing, p. 149'}},
      {type:'yes',kicker:es?'¿Lo intentará?':'Will you try it?',headline:es?'Seis semanas. Elija cómo quiere participar':'Six weeks. Choose how you would like to be part of it',
       options:es?[{k:'lead',label:'Dirigir',text:'Coordinar o ser consejero durante la prueba.'},{k:'help',label:'Ayudar',text:'Conducir, dar la bienvenida o preparar la merienda una noche al mes.'},{k:'pray',label:'Orar',text:'Orar cada martes por los niños y las familias.'}]
                 :[{k:'lead',label:'Lead',text:'Coordinate, or counsel a group, for the trial.'},{k:'help',label:'Help',text:'Drive, welcome or bring the snack one night a month.'},{k:'pray',label:'Pray',text:'Pray each Tuesday for the children and their families.'}],
       respond:true}
    ]; return d; };

  /* ---- C. Sabbath congregation ---- */
  const congregation=lang=>{ const es=lang==='es'; const d=base(lang,'congregation','congregation',es?'Levantémonos y edifiquemos':'Let us rise up and build');
    d.slides=[
      join(es),
      {type:'verse',...V.neh[lang]},
      {type:'stat',kicker:es?'Nuestros vecinos':'Our neighbours',headline:es?'Estas son las personas que Dios puso a nuestro alrededor':'These are the people God has put around us',
       value:n$(T.pop),unit:es?'vecinos':'neighbours',hue:'people',freq:es?`en ${n$(T.hh)} hogares`:`in ${n$(T.hh)} homes`,
       count:es?`${Math.round(T.kidsShare)} de cada 100 son niños`:`${Math.round(T.kidsShare)} in every 100 are children`,
       dots:{n:100,on:Math.round(T.kidsShare),hue:'children'},compare:null,
       source:es?'Censo de EE. UU., ACS 2020–2024 · Sector censal 2041.02':'U.S. Census ACS 2020–2024 · Census Tract 2041.02'},
      {type:'trio',kicker:es?'Lo que aprendimos':'What we learned',headline:es?'Muchas familias aquí lo llevan solas':'Many families here are carrying it alone',
       items:es?[{value:`1 de ${oneIn(T.kidsShare)}`,label:'vecinos es un niño.',hue:'children'},
                 {value:`1 de ${oneIn(T.singleParent)}`,label:'familias con hijos tiene un solo padre o madre.',hue:'children'},
                 {value:`1 de ${oneIn(T.spanish)}`,label:'vecinos habla español en casa.',hue:'language'}]
               :[{value:`1 in ${oneIn(T.kidsShare)}`,label:'people around us is a child.',hue:'children'},
                 {value:`1 in ${oneIn(T.singleParent)}`,label:'families with children has one parent carrying it all.',hue:'children'},
                 {value:`1 in ${oneIn(T.spanish)}`,label:'neighbours speak Spanish at home.',hue:'language'}],
       source:es?'ACS 2020–2024 · Sector censal 2041.02':'ACS 2020–2024 · Census Tract 2041.02'},
      ability(es,es?'Lo que Dios ya puso aquí':'What God has already put here',es?'Los dones para esto ya están en esta sala':'The gifts for this are already in this room',''),
      {type:'motion',kicker:es?'El plan':'The plan',headline:es?'Un club de Conquistadores y Aventureros, abierto al vecindario':'A Pathfinder & Adventurer club, open to the neighborhood',
       rows:es?[['Cuándo','Martes 6:30 p. m., desde el 7 oct.'],['Dónde','Nuestras aulas'],['Para quién',`${N.places} niños de 6 a 15 años`],['Durante','Seis semanas, y luego evaluamos']]
              :[['When','Tuesdays 6:30 pm, from 7 Oct'],['Where','Our classrooms'],['For',`${N.places} children, ages 6 to 15`],['For how long','Six weeks, then we take stock']],
       by:es?'Aprobado por la junta de la iglesia el 21 sept. 2026':'Approved by the church board on 21 Sep 2026'},
      {type:'yes',kicker:es?'Tres maneras de decir sí':'Three sizes of yes',headline:es?'Todos pueden tener parte en esto':'There is a part in this for everyone',
       options:es?[{k:'pray',label:'Orar',text:'Por los niños y las familias, cada semana, por nombre.'},{k:'help',label:'Ayudar',text:'Una noche al mes: conducir, recibir o preparar la merienda.'},{k:'lead',label:'Dirigir',text:'Enseñar o guiar un grupo (requiere verificación).'}]
                 :[{k:'pray',label:'Pray',text:'For the children and families, each week, by name.'},{k:'help',label:'Help',text:'One evening a month: drive, welcome or bring the snack.'},{k:'lead',label:'Lead',text:'Teach or guide a group (screening required).'}],
       respond:true},
      {type:'close',kicker:es?'Nuestra promesa':'Our promise',headline:es?'Le informaremos el 22 de noviembre':'We will report back on 22 November',
       text:es?'Cuántos niños vinieron, quién volvió y qué aprendimos. Gracias por orar y por decir sí.':'How many children came, who came back and what we learned. Thank you for praying and for saying yes.',
       quote:es?{text:'A la verdad la mies es mucha, mas los obreros pocos. Rogad, pues, al Señor de la mies, que envíe obreros á su mies.',ref:'Mateo 9:37, 38 · RVA'}:V.pk6383}
    ]; return d; };

  return {board:{en:board('en'),es:board('es')},team:{en:team('en'),es:team('es')},congregation:{en:congregation('en'),es:congregation('es')}};
}

/* A deck built to break things: markup in every string, out-of-range
   numbers, unknown types and hues. The renderer must show it as text. */
function demoHostileDeck(){
  const x='<img src=x onerror="window.__pwned=1">"&<script>window.__pwned=2</script>';
  return {kind:'tdeck',ver:1,lang:'en',title:x,church:x,slides:[
    {type:'join',qrUrl:'javascript:alert(1)',code6:'<b>',note:x},
    {type:'stat',kicker:x,headline:x,value:x,unit:'%',hue:'red;background:url(x)',freq:x,count:x,dots:{n:1e9,on:-5,hue:x},compare:{here:NaN,county:Infinity,label:x,sig:'yes',moe:x},source:x},
    {type:'motion',kicker:x,headline:x,rows:[[x,x],[x,x]],by:x},
    {type:'trio',items:[{value:x,label:x,hue:x},null,7],headline:x},
    {type:'capacity',headline:x,rows:[{label:x,need:3,have:1,unit:x}],gaps:[x]},
    {type:'ability',headline:x,value:x,label:x,gifts:[x,{name:x,hue:'x'}],lead:x},
    {type:'ask',headline:x,rows:[[x,x]],verse:{text:x,ref:x}},
    {type:'yes',headline:x,options:[{k:'__proto__',label:x,text:x},{k:'constructor',label:x,text:x}],respond:true},
    {type:'nope',headline:x},
    {type:'constructor',headline:x},
    {type:'verse',text:x,ref:x,version:x},
    {type:'close',headline:x,text:x,quote:{text:x,ref:x}}
  ]};
}
