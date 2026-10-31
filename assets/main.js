(function(){
var els=document.querySelectorAll('.reveal');
if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});}
else{var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}})},{threshold:.06,rootMargin:'0px 0px -30px 0px'});els.forEach(function(e){io.observe(e)});}
document.querySelectorAll('.grid,.steps,.stats').forEach(function(g){Array.prototype.forEach.call(g.children,function(c,i){c.style.transitionDelay=(i*60)+'ms'})});
var links=[].slice.call(document.querySelectorAll('.navin a'));
var secs=links.map(function(a){return document.querySelector(a.getAttribute('href'))});
function onScroll(){var y=window.scrollY+120,cur=-1;secs.forEach(function(s,i){if(s&&s.offsetTop<=y)cur=i});links.forEach(function(a,i){a.classList.toggle('on',i===cur)});
 if(cur>=0){var a=links[cur],n=a.parentNode;if(n.scrollTo)n.scrollTo({left:a.offsetLeft-n.clientWidth/2+a.clientWidth/2,behavior:'smooth'});}}
var t;window.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(onScroll,60)},{passive:true});onScroll();
})();

/* 상품명 체크기 — 공식 상품명 가이드(쇼핑검색 SEO & 상품정보 제공 가이드)를 단순화한 자가진단. 네이버의 실제 판정이 아님 */
(function(){
var inp=document.getElementById('pname');if(!inp)return;
var out=document.getElementById('pcheck'),bar=document.getElementById('pbar'),sc=document.getElementById('pscore'),cnt=document.getElementById('pcnt');
var PROMO=['할인','세일','특가','최저가','무료배송','쿠폰','적립','이벤트','사은품','당일발송','핫딜','1+1','증정'];
var HYPE=['인기','추천','강추','대박','베스트','최고','히트','프리미엄','고급','초특가','신상'];
function chars(s){return Array.from(s).length}
function run(){
 var v=inp.value.trim(),n=chars(v);cnt.textContent=n+'자';
 if(!v){out.innerHTML='<li><b>·</b>상품명을 입력하면 바로 점검해 드려요</li>';bar.style.width='0';bar.style.background='';sc.textContent='--';return}
 var items=[],pts=0,max=0;
 function add(w,st,msg){max+=w;if(st==='ok')pts+=w;else if(st==='wn')pts+=w*.5;items.push([st,msg])}
 // length
 if(n<=50)add(20,'ok','길이 '+n+'자 · 권장 범위(50자 내외)예요');
 else if(n<=100)add(20,'wn','길이 '+n+'자 · 가이드가 안내하는 50자 내외보다 길어요. 핵심 정보 위주로 줄여 보세요');
 else add(20,'no','길이 '+n+'자 · 너무 길어요. 간결하게 줄이세요');
 if(n<8)add(10,'wn','너무 짧아요. 브랜드·모델·옵션 등 사용자가 필요한 정보는 담아야 해요');else add(10,'ok','최소한의 정보량은 있어 보여요');
 // special chars
 var sp=v.replace(/[0-9A-Za-z\uAC00-\uD7A3\s\(\)\-·\[\]\/&\+,~\.]/g,'');
 if(!sp)add(15,'ok','특수문자를 거의 쓰지 않았어요');else add(15,'no','눈에 띄는 기호가 있어요: '+Array.from(new Set(sp.split(''))).join(' ')+' — 특수문자는 최소화하는 게 안내 방향이에요');
 var spc=(v.match(/[\(\)\-·\[\]\/&\+,~\.]/g)||[]).length;
 if(spc>4)add(5,'wn','기호가 많아요 ('+spc+'개). 꼭 필요한 것만 남겨 보세요');else add(5,'ok','기호 사용량이 적절해요');
 // language
 if(/[\u3040-\u30FF\u4E00-\u9FFF]/.test(v))add(10,'no','한글·영문 외 문자(일본어·한자)가 보여요');else add(10,'ok','한글/영문 위주로 작성했어요');
 // repeat
 var words=v.toLowerCase().split(/[\s\(\)\-·\[\]\/&\+,~\.]+/).filter(function(w){return w.length>=2});
 var seen={},dup=[];words.forEach(function(w){if(seen[w]&&dup.indexOf(w)<0)dup.push(w);seen[w]=1});
 if(!dup.length)add(15,'ok','중복 단어가 없어요');else add(15,'no','같은 단어가 반복돼요: '+dup.join(', ')+' — 중복은 어뷰징으로 인식될 수 있어요');
 // promo
 var pf=PROMO.filter(function(w){return v.indexOf(w)>=0});
 if(!pf.length)add(15,'ok','할인·이벤트·쿠폰 같은 판매조건 문구가 없어요');else add(15,'no','판매조건/혜택 문구가 있어요: '+pf.join(', ')+' — 가격·쿠폰·이벤트는 별도 필드에 넣으세요');
 var hf=HYPE.filter(function(w){return v.indexOf(w)>=0});
 if(!hf.length)add(10,'ok','수식어가 없어요');else add(10,'wn','수식어 후보: '+hf.join(', ')+' — 수식어는 쓰지 않도록 안내해요(예시 목록이며 공식 금지어 목록은 아니에요)');
 // numeric spec
 if(/[0-9]/.test(v))add(5,'ok','수량/용량/모델 같은 숫자 정보가 있어요');else add(5,'wn','수량·용량·사이즈 등 대표 옵션 숫자가 없는지 확인해 보세요');
 var pct=Math.round(pts/max*100);
 sc.textContent=pct;bar.style.width=pct+'%';bar.style.background=pct>=80?'var(--ok)':pct>=60?'var(--blue)':pct>=40?'var(--warn)':'var(--red)';
 out.innerHTML=items.map(function(i){return '<li class="'+i[0]+'"><b>'+(i[0]==='ok'?'✓':i[0]==='no'?'!':'~')+'</b><span>'+i[1].replace(/</g,'&lt;')+'</span></li>'}).join('');
}
inp.addEventListener('input',run);
var ex=document.getElementById('pex');if(ex)ex.addEventListener('click',function(){inp.value='매일유업 블루다이아몬드 아몬드브리즈 초콜릿맛 190ml 24개';run()});
var bd=document.getElementById('pbad');if(bd)bd.addEventListener('click',function(){inp.value='[특가 무료배송] 최고 인기 베스트 아몬드브리즈 아몬드브리즈 초콜릿 쿠폰적용 ★강추★ 대박';run()});
run();
})();

/* 상품 경쟁력 자가진단 — 체크 항목 수에 따른 단순 점수. 네이버 점수가 아니며 가중치는 임의 */
(function(){
var boxes=[].slice.call(document.querySelectorAll('.chk input'));if(!boxes.length)return;
var KEY='nss-chk-v1',saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
var bar=document.getElementById('cbar'),sc=document.getElementById('cscore'),msg=document.getElementById('cmsg'),g={rel:document.getElementById('grel'),pop:document.getElementById('gpop'),trust:document.getElementById('gtrust')};
function upd(){
 var tot={rel:[0,0],pop:[0,0],trust:[0,0]},all=0;
 boxes.forEach(function(b){var k=b.dataset.g;tot[k][1]++;if(b.checked){tot[k][0]++;all++}});
 var pct=Math.round(all/boxes.length*100);sc.textContent=pct;bar.style.width=pct+'%';
 bar.style.background=pct>=80?'var(--ok)':pct>=50?'var(--blue)':'var(--warn)';
 Object.keys(g).forEach(function(k){if(g[k])g[k].textContent=tot[k][0]+' / '+tot[k][1]});
 var weak=Object.keys(tot).map(function(k){return[k,tot[k][0]/tot[k][1]]}).sort(function(a,b){return a[1]-b[1]})[0];
 var nm={rel:'적합도(상품 정보)',pop:'인기도(클릭·판매·리뷰)',trust:'신뢰도(SEO·정책)'};
 msg.textContent=all===0?'체크하면서 내 상품 상태를 점검해 보세요.':(all===boxes.length?'모든 항목을 갖췄어요. 이제 지표를 보며 개선해요.':'가장 먼저 보강할 영역: '+nm[weak[0]]);
}
boxes.forEach(function(b,i){if(saved[i])b.checked=true;b.addEventListener('change',function(){saved[i]=b.checked;try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}upd()})});
upd();
})();
