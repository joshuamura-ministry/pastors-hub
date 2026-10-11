// v10.67.0 · the church directory, built in "Your church". The pastor (10–11 Oct 2026): "the churches need to have a really nice directory
// with pictures and everything so that we can know each other", then "is it possible to create a CHURCH directory build builder where if I
// have the photos and the information names and number if I put it all in it can build a printable church directory"; his choices: in
// "Your church", Letter pages; and "It should have a tab on the top that says build your church directory". Everything stays on the device;
// children only when a parent said yes; every page for members only. The families below are MADE UP. Written failing-first on v10.66.0.
const {sleep,checker,page,ready,survey}=require('./v45-helpers.js');
const {jsPDF}=require('jspdf');
const T=checker(), c=T.c;
const txt=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';
// a real 8 × 6 JPEG (made from a screenshot with macOS sips), so the PDF can carry a photo
const JPG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAACKADAAQAAAABAAAABgAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgABgAIAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICBAICBAYEBAQGCAYGBgYICggICAgICgwKCgoKCgoMDAwMDAwMDA4ODg4ODhAQEBAQEhISEhISEhISEv/bAEMBAwMDBQQFCAQECBMNCw0TExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTE//dAAQAAf/aAAwDAQACEQMRAD8A/DeS/tZLJLWJDuCBSxA+97Y5xWT5TetNj+9+NWK6DOOx/9k=';
(async()=>{ await T.sec(async()=>{
  console.log('\n-- the tab at the top of "Your church" --');
  const P=page({}); await ready(P); survey(P); await sleep(200);
  const tab=P.q('#u-church #u-dirtab');
  c('"Build your church directory", at the top of "Your church" (above its card, which folds), with a picture of a book', tab?[txt(tab.querySelector('b')),tab.parentNode.id==='u-church'&&tab.nextElementSibling&&tab.nextElementSibling.id==='u-churchslot',!!tab.querySelector('svg')]:null, ['Build your church directory',true,true]);
  c('…before any family: "With photos, to print"', txt(tab.querySelector('span')), 'With photos, to print');
  const before=P.w.__fetched.length;
  tab.click(); await sleep(60);
  const d=P.q('#dir-sheet');
  c('a tap opens the builder: no families yet, the PDF waiting for one', [!!d&&d.hasAttribute('open'),P.txt('#dir-h'),!!P.q('#dir-sheet .dir-empty'),P.q('#dir-sheet [data-dir="pdf"]').disabled], [true,'Your church directory',true,true]);
  c('…it says everything stays on this device', /Everything stays on this device/.test(P.txt('#dir-sheet')), true);

  console.log('\n-- a family, one at a time --');
  P.q('#dir-sheet [data-dir="add"]').click(); await sleep(30);
  const set=(id,v)=>{ P.q('#'+id).value=v; };
  P.q('#dir-sheet [data-dir="savefam"]').click(); await sleep(30);
  c('the family name first', P.txt('#dir-emsg'), 'The family name, please.');
  set('dir-family','Sample-Rivera'); set('dir-people','Ana and Luis'); set('dir-kids','Sofi, Mateo'); set('dir-phone','555-0101'); set('dir-email','rivera@example.org');
  P.q('#dir-sheet [data-dir="savefam"]').click(); await sleep(60);
  const fam=P.J('uChurch().directory.families');
  c('saved with the church on this device: the names, the phone, the email; the children kept but not shown until a parent says yes', [fam.length,fam[0].family,fam[0].kidsOk,/children not shown/.test(P.txt('#dir-sheet .dir-fam'))], [1,'Sample-Rivera',false,true]);
  c('…the tab counts it', P.txt('#u-dirtab span'), '1 family');

  console.log('\n-- the clerk\'s list and a folder of photos --');
  P.q('#dir-sheet [data-dir="import"]').click(); await sleep(30);
  set('dir-paste','Family\tAdults\tChildren\tPhone\tEmail\tAddress\tPhoto\nSample-Chen\tDavid and Grace\t\t555-0102\tchen@example.org\t12 Elm St\tchen-family.jpg\nSample-Okafor\tEmeka\tAda\t555-0103\t\t\t\nSample-Smith\tJohn and Mary\t\t555-0104\t\t\t');
  P.q('#dir-sheet [data-dir="dopaste"]').click(); await sleep(40);
  c('pasted rows become families (the columns found by their names)', [P.J('uChurch().directory.families.length'),P.txt('#dir-imsg')], [4,'Added 3 families. Now the photos, if you have them.']);
  P.E(`dirPhotoFrom=async f=>${JSON.stringify(JPG)}`);
  const F=n=>new P.w.File(['x'],n,{type:'image/jpeg'});
  const r=await P.w.eval('dirAddPhotos')([F('Sample-Smith.jpg'),F('chen-family.jpg'),F('Sample-Rivera.JPG'),F('Unknown-Family.jpg')]);
  c('photos match their families by file name, or by the list\'s Photo column; the rest are named', [r.hit,r.miss,P.J('uChurch().directory.families.filter(f=>f.photo).map(f=>f.family).sort()')], [3,['Unknown-Family.jpg'],['Sample-Chen','Sample-Rivera','Sample-Smith']]);
  c('…the photos kept on the device, not in the church\'s saved text', [!!(await P.w.eval('dirPhotoGet')(P.E("dirKey(uChurch().directory.families.find(f=>f.family==='Sample-Smith').id)"))),/base64/.test(P.E("localStorage.getItem('terrain-churches-v1')"))], [true,false]);
  P.E("DIR_ST.view='list'; dirDraw();"); await sleep(30);
  c('the list: alphabetical, with photos', P.qa('#dir-sheet .dir-fam .dir-fi b').map(txt), ['Sample-Chen','Sample-Okafor','Sample-Rivera','Sample-Smith']);

  console.log('\n-- the children only with a parent\'s yes --');
  P.q('#dir-sheet .dir-fam:nth-child(3) [data-dir="edit"]').click(); await sleep(30);
  c('editing a family shows what was saved', [P.q('#dir-family').value,P.q('#dir-kids').value,P.q('#dir-kidsok').checked], ['Sample-Rivera','Sofi, Mateo',false]);
  P.q('#dir-kidsok').checked=true; P.q('#dir-sheet [data-dir="savefam"]').click(); await sleep(40);
  c('a parent said yes: the children show', P.J("uChurch().directory.families.find(f=>f.family==='Sample-Rivera').kidsOk"), true);

  console.log('\n-- the cover and the officers --');
  P.q('#dir-sheet [data-dir="details"]').click(); await sleep(30);
  set('dir-title','Sample Church'); set('dir-year','2027'); set('dir-note','We are glad you are part of this family.');
  const offs=P.qa('#dir-sheet .dir-off'); offs[0].querySelector('[data-o="name"]').value='Pastor Sample'; offs[1].querySelector('[data-o="name"]').value='Elder Sample';
  P.q('#dir-sheet [data-dir="savedet"]').click(); await sleep(30);
  c('saved: the title, the year, a word from the pastor, the officers with names', [P.J('uChurch().directory.title'),P.J('uChurch().directory.year'),P.J('uChurch().directory.officers.map(o=>o.role+": "+o.name)')], ['Sample Church','2027',['Pastor: Pastor Sample','Head elder: Elder Sample']]);

  console.log('\n-- the printed directory --');
  const doc=await P.w.eval('dirPdfDoc')({jsPDF});
  const raw=doc.output(), pages=doc.getNumberOfPages();
  c('Letter pages: the cover, the pastor\'s page, the families (eight a page), who\'s who', [pages,Math.round(doc.internal.pageSize.getWidth()),Math.round(doc.internal.pageSize.getHeight())], [4,612,792]);
  c('…every page for members only', (raw.match(/For members only\. Please do not share outside the church\./g)||[]).length, 4);
  c('…the cover: the title, Church directory · 2027, 4 families', [/\(Sample Church\)/.test(raw),/Church directory \S 2027/.test(raw),/\(4 families\)/.test(raw)], [true,true,true]);
  c('…each family\'s names and numbers; the photos in it', [/\(Sample-Chen\)/.test(raw),/\(David and Grace\)/.test(raw),/\(555-0102\)/.test(raw),/\/Subtype \/Image/.test(raw)], [true,true,true,true]);
  c('…the children of a family whose parent said yes, and not of one that did not', [/\(Sofi, Mateo\)/.test(raw),/\(Ada\)/.test(raw)], [true,false]);
  c('…who\'s who: every first name with its family and page', [/Who.s who/.test(raw),/\(Emeka Sample-Okafor\)/.test(raw),/\(Sofi Sample-Rivera\)/.test(raw)], [true,true,true]);
  c('the file\'s name', P.E('dirPdfName()'), 'Church-directory-Sample-Church-2027.pdf');

  console.log('\n-- a copy to move it to another computer --');
  const copy=JSON.stringify({kind:'terrain-directory',v:1,directory:{families:[{id:'x1',family:'Sample-Lopez',people:'Rosa',kids:'',kidsOk:false,phone:'555-0105',email:'',address:''}],title:'',officers:[]},photos:{x1:JPG}});
  const n=await P.w.eval('dirLoadCopy')(copy);
  c('loading a copy adds its families and their photos', [n,P.J("uChurch().directory.families.find(f=>f.family==='Sample-Lopez').photo")], [1,true]);
  c('…a file that is not a directory is refused', [await P.w.eval('dirLoadCopy')('{"kind":"something"}'),P.E('DIR_ST.msg')], [false,'That file is not a Terrain church directory.']);

  console.log('\n-- removing a family takes two taps --');
  P.E("DIR_ST.view='list'; dirDraw();"); await sleep(20);
  P.q('#dir-sheet .dir-fam:nth-child(1) [data-dir="edit"]').click(); await sleep(30);
  P.q('#dir-sheet [data-dir="rmfam"]').click(); await sleep(20);
  c('one tap asks', [P.txt('#dir-sheet [data-dir="rmfam"]'),P.J('uChurch().directory.families.length')], ['Tap again to remove',5]);
  P.q('#dir-sheet [data-dir="rmfam"]').click(); await sleep(40);
  c('the second removes it', P.J('uChurch().directory.families.length'), 4);
  c('nothing was sent anywhere while building it', P.w.__fetched.slice(before).filter(u=>/functions|https?:/.test(u)), []);
  c('no page errors', P.errs, []);

  console.log('\n-- in Spanish --');
  const S=page({lang:'es'}); await ready(S); survey(S); await sleep(200);
  c('the tab', txt(S.q('#u-dirtab b')), 'Haga el directorio de su iglesia');
  S.q('#u-dirtab').click(); await sleep(40);
  c('the builder', [S.txt('#dir-h'),txt(S.q('#dir-sheet [data-dir="add"]'))], ['El directorio de su iglesia','+ Agregar una familia']);
  c('no page errors', S.errs, []);
}); T.done(); })();
