
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, updateDoc, setDoc,
  query, orderBy, onSnapshot, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $ = s => document.querySelector(s);
const configured = !Object.values(firebaseConfig).some(v => String(v).startsWith("PASTE_"));
if(!configured){
  $("#configBanner").classList.remove("hidden");
  $("#authCard").classList.add("hidden");
}

const DEFAULT_STORES = [
 "PMI","小尾羊火锅大久保","小尾羊火锅銀座","酒場もんじゃ","上池袋麻辣烫","川口麻辣烫","王子麻辣烫","本乡麻辣烫",
 "北京焼鴨店（上野）","三九厨房（渋谷）","三九厨房（有楽町）","四季香（上野）","羊貴族（四季香）","四季香（本店）",
 "四季香（大久保店）","南口老妈火锅","鶏闘士","新栄","鶏闘士（南口）","新栄記","金辉"
];

let app, auth, db, user=null, records=[], stores=[];
let unsubRecords=null, unsubStores=null;

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
$("#dateInput").value=today; $("#invoiceDateInput").value=today; $("#monthInput").value=today.slice(0,7);

const yen=n=>"¥"+Math.round(Number(n||0)).toLocaleString("ja-JP");
const fmt=d=>{const [y,m,dd]=(d||"").split("-"); return d?`${y}/${Number(m)}/${Number(dd)}`:""};
const safeName=s=>String(s).replace(/[\\/:*?"<>|]/g,"_");
const invoiceNo=d=>d.replaceAll("-","")+"001";

if(configured){
  app=initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app);
  onAuthStateChanged(auth, async u=>{
    user=u;
    if(u){
      $("#authCard").classList.add("hidden"); $("#mainApp").classList.remove("hidden"); $("#logoutBtn").classList.remove("hidden");
      $("#userLabel").textContent=u.email||"已登录";
      await seedStoresIfNeeded(); startListeners();
    }else{
      if(unsubRecords)unsubRecords(); if(unsubStores)unsubStores();
      $("#authCard").classList.remove("hidden"); $("#mainApp").classList.add("hidden"); $("#logoutBtn").classList.add("hidden"); $("#userLabel").textContent="未登录";
    }
  });
}

$("#loginBtn").onclick=async()=>{
  try{ $("#authStatus").textContent="登录中…"; await signInWithEmailAndPassword(auth,$("#emailInput").value.trim(),$("#passwordInput").value); $("#authStatus").textContent=""; }
  catch(e){$("#authStatus").textContent="登录失败："+friendlyError(e)}
};
$("#registerBtn").onclick=async()=>{
  try{ $("#authStatus").textContent="注册中…"; await createUserWithEmailAndPassword(auth,$("#emailInput").value.trim(),$("#passwordInput").value); $("#authStatus").textContent=""; }
  catch(e){$("#authStatus").textContent="注册失败："+friendlyError(e)}
};
$("#logoutBtn").onclick=()=>signOut(auth);

function friendlyError(e){
  const c=e?.code||"";
  if(c.includes("invalid-credential"))return "邮箱或密码不正确";
  if(c.includes("email-already-in-use"))return "这个邮箱已经注册";
  if(c.includes("weak-password"))return "密码至少 6 位";
  if(c.includes("invalid-email"))return "邮箱格式不正确";
  return e?.message||"发生错误";
}

async function seedStoresIfNeeded(){
  const ref=collection(db,"users",user.uid,"stores");
  const snap=await getDocs(ref);
  if(!snap.empty)return;
  for(const name of DEFAULT_STORES){
    await setDoc(doc(ref,crypto.randomUUID()),{name,post:"",address:"",tel:"",createdAt:serverTimestamp()});
  }
}
function startListeners(){
  const recRef=query(collection(db,"users",user.uid,"records"),orderBy("date","desc"));
  unsubRecords=onSnapshot(recRef,s=>{records=s.docs.map(d=>({id:d.id,...d.data()})); renderAll()});
  const storeRef=query(collection(db,"users",user.uid,"stores"),orderBy("name"));
  unsubStores=onSnapshot(storeRef,s=>{stores=s.docs.map(d=>({id:d.id,...d.data()})); renderAll()});
}

async function saveRecord(keepStore){
  const store=$("#storeSelect").value, date=$("#dateInput").value, amount=Math.round(Number($("#amountInput").value));
  if(!store||!date||!amount||amount<=0){$("#saveStatus").textContent="请填写店铺、日期和有效金额。";return}
  try{
    await addDoc(collection(db,"users",user.uid,"records"),{store,date,amount,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    $("#saveStatus").textContent=`已保存：${store} ${fmt(date)} ${yen(amount)}`; $("#amountInput").value="";
    if(!keepStore)$("#storeSelect").value="";
  }catch(e){$("#saveStatus").textContent="保存失败："+e.message}
}
$("#saveBtn").onclick=()=>saveRecord(false); $("#saveContinueBtn").onclick=()=>saveRecord(true);
$("#storeSelect").onchange=renderCurrent; $("#dateInput").onchange=renderCurrent; $("#monthInput").onchange=renderMonthly;

function renderAll(){renderStoreSelect();renderRecords();renderCurrent();renderMonthly();renderStoreSettings()}
function renderStoreSelect(){
  const el=$("#storeSelect"), cur=el.value; el.innerHTML='<option value="">请选择店铺</option>';
  stores.forEach(s=>{const o=document.createElement("option");o.value=s.name;o.textContent=s.name;el.appendChild(o)}); if(cur)el.value=cur;
}
function renderRecords(){
  const body=$("#recordsBody");body.innerHTML="";
  records.slice(0,100).forEach(r=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${esc(r.store)}</td><td>${fmt(r.date)}</td><td class="num">${yen(r.amount)}</td><td><button class="btn danger del">删除</button></td>`;
    tr.querySelector(".del").onclick=async()=>{if(confirm("删除这条记录？"))await deleteDoc(doc(db,"users",user.uid,"records",r.id))};body.appendChild(tr)
  });
  $("#recordCount").textContent=`${records.length} 条`;
}
function renderCurrent(){
  const store=$("#storeSelect").value, month=($("#dateInput").value||today).slice(0,7);
  $("#currentStoreLabel").textContent=store||"请选择店铺";const wrap=$("#currentStoreList");wrap.innerHTML="";
  const rows=records.filter(r=>r.store===store&&r.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
  $("#currentStoreTotal").textContent=yen(rows.reduce((s,r)=>s+r.amount,0));
  rows.forEach(r=>{const d=document.createElement("div");d.className="mini-item";d.innerHTML=`<span>${fmt(r.date)}</span><b>${yen(r.amount)}</b>`;wrap.appendChild(d)})
}
function renderMonthly(){
  const month=$("#monthInput").value, map=new Map();
  records.filter(r=>r.date.startsWith(month)).forEach(r=>{if(!map.has(r.store))map.set(r.store,{count:0,total:0});const g=map.get(r.store);g.count++;g.total+=r.amount});
  const wrap=$("#monthlyList");wrap.innerHTML="";
  [...map.entries()].sort((a,b)=>b[1].total-a[1].total).forEach(([name,g])=>{
    const d=document.createElement("div");d.className="monthly-item";d.innerHTML=`<div class="monthly-head"><div><b>${esc(name)}</b><div class="muted">${g.count} 笔</div></div><div class="total" style="font-size:18px">${yen(g.total)}</div></div><div class="actions"><button class="btn primary onepdf">生成 PDF</button></div>`;
    d.querySelector(".onepdf").onclick=()=>downloadOnePdf(name);wrap.appendChild(d)
  });
  $("#monthlyGrandTotal").textContent=yen([...map.values()].reduce((s,g)=>s+g.total,0));
}
function renderStoreSettings(){
  const wrap=$("#storeSettings");wrap.innerHTML="";
  stores.forEach(s=>{
    const box=document.createElement("div");box.className="store-card";
    box.innerHTML=`<div class="flex-between"><b>${esc(s.name)}</b><button class="btn danger remove">删除店铺</button></div>
      <div class="store-grid">
        <div><label>邮编</label><input class="post" value="${attr(s.post||"")}"></div>
        <div><label>地址</label><input class="address" value="${attr(s.address||"")}"></div>
        <div><label>电话</label><input class="tel" value="${attr(s.tel||"")}"></div>
      </div><div class="actions"><button class="btn save-store">保存资料</button></div>`;
    box.querySelector(".save-store").onclick=()=>updateDoc(doc(db,"users",user.uid,"stores",s.id),{post:box.querySelector(".post").value.trim(),address:box.querySelector(".address").value.trim(),tel:box.querySelector(".tel").value.trim(),updatedAt:serverTimestamp()});
    box.querySelector(".remove").onclick=async()=>{if(confirm(`删除店铺「${s.name}」？历史记录不会删除。`))await deleteDoc(doc(db,"users",user.uid,"stores",s.id))};
    wrap.appendChild(box)
  });
}
$("#addStoreBtn").onclick=async()=>{
  const name=prompt("输入新店铺名称");if(!name)return;
  await addDoc(collection(db,"users",user.uid,"stores"),{name:name.trim(),post:"",address:"",tel:"",createdAt:serverTimestamp()});
};

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); $("#tab-"+b.dataset.tab).classList.add("active");
});

async function ensurePdfLib(){
  if(!window.jspdf?.jsPDF)throw new Error("PDF 库加载失败，请检查网络连接");
}

async function buildPdf(storeName){
  if(!window.html2canvas) throw new Error("PDF 渲染库加载失败，请检查网络连接");
  const {jsPDF}=window.jspdf;
  const month=$("#monthInput").value, invDate=$("#invoiceDateInput").value;
  const store=stores.find(s=>s.name===storeName)||{name:storeName,post:"",address:"",tel:""};
  const rows=records.filter(r=>r.store===storeName&&r.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
  const gross=rows.reduce((s,r)=>s+r.amount,0);
  const net=Math.floor(gross/1.08), tax=gross-net;

  const root=document.getElementById("pdfRenderRoot");
  const rowHtml = rows.map(r=>`
    <tr>
      <td>${fmt(r.date)}</td>
      <td></td>
      <td style="text-align:right">¥${Number(r.amount).toLocaleString("ja-JP")}</td>
    </tr>`).join("");

  const blanks = Math.max(0, 10-rows.length);
  const blankHtml = Array.from({length:blanks},()=>`<tr><td>&nbsp;</td><td></td><td></td></tr>`).join("");

  root.innerHTML = `
  <div id="pdfSheet" style="
      width:794px; min-height:1123px; padding:58px 54px 48px; background:#fff; color:#111;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic','YuGothic','Meiryo','Noto Sans JP','Noto Sans SC',sans-serif;
      box-sizing:border-box;">
    <div style="text-align:center;font-size:28px;font-weight:700;letter-spacing:2px;margin-bottom:34px">請求書</div>

    <div style="display:flex;justify-content:space-between;gap:28px;font-size:13px;line-height:1.65">
      <div style="width:58%">
        <div style="font-size:20px;font-weight:700;margin-bottom:5px">${esc(store.name)}</div>
        <div>${store.post?`〒${esc(store.post)}`:""}</div>
        <div>${esc(store.address||"")}</div>
        <div>${store.tel?`TEL: ${esc(store.tel)}`:""}</div>
      </div>
      <div style="width:38%;padding-top:3px">
        <div>請求日　${fmt(invDate)}</div>
        <div>請求書番号　${invoiceNo(invDate)}</div>
        <div>登録番号　T9010001169651</div>
      </div>
    </div>

    <div style="margin-top:28px;font-size:13px;line-height:1.6">
      <div style="font-weight:700">請求元</div>
      <div style="font-weight:700;font-size:15px">食為天株式会社</div>
      <div>〒104-0033</div>
      <div>東京都中央区新川1-3-4</div>
      <div>TEL: 080-5504-2586</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:28px;font-size:12px">
      <thead>
        <tr>
          <th style="border:1px solid #111;padding:8px;text-align:left;width:48%">振込先</th>
          <th style="border:1px solid #111;padding:8px;text-align:left;width:20%">入金期限</th>
          <th style="border:1px solid #111;padding:8px;text-align:left;width:32%">請求金額</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border:1px solid #111;padding:9px;vertical-align:top">
            三井住友銀行　店番号034　普通預金　7776807<br>食為天株式会社 日本橋東支店
          </td>
          <td style="border:1px solid #111;padding:9px;vertical-align:top">今月末</td>
          <td style="border:1px solid #111;padding:9px;font-size:20px;font-weight:700;vertical-align:top">¥${gross.toLocaleString("ja-JP")}</td>
        </tr>
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:12px">
      <thead>
        <tr>
          <th style="padding:7px 6px;border-bottom:1px solid #8d7a2b;text-align:left;width:28%">取引日</th>
          <th style="padding:7px 6px;border-bottom:1px solid #8d7a2b;text-align:left">詳細</th>
          <th style="padding:7px 6px;border-bottom:1px solid #8d7a2b;text-align:right;width:28%">金額（税込）</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml}${blankHtml}
      </tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-top:36px">
      <table style="width:320px;border-collapse:collapse;font-size:12px">
        <tr><td style="border:1px solid #111;padding:8px;font-weight:700">合計（税込）</td><td style="border:1px solid #111;padding:8px;text-align:right;font-weight:700">¥${gross.toLocaleString("ja-JP")}</td></tr>
        <tr><td style="border:1px solid #111;padding:8px">税率</td><td style="border:1px solid #111;padding:8px;text-align:right">8%</td></tr>
        <tr><td style="border:1px solid #111;padding:8px">内消費税</td><td style="border:1px solid #111;padding:8px;text-align:right">¥${tax.toLocaleString("ja-JP")}</td></tr>
      </table>
    </div>
  </div>`;

  const sheet=root.querySelector("#pdfSheet");
  await document.fonts.ready;
  const canvas=await window.html2canvas(sheet,{
    scale:2,
    backgroundColor:"#ffffff",
    useCORS:true,
    logging:false
  });

  const imgData=canvas.toDataURL("image/jpeg",0.98);
  const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
  const pageW=210, pageH=297;
  pdf.addImage(imgData,"JPEG",0,0,pageW,pageH,undefined,"FAST");
  root.innerHTML="";
  return pdf;
}
async function downloadOnePdf(storeName){
  try{await ensurePdfLib();const pdf=await buildPdf(storeName);pdf.save(`${safeName(storeName)}_${$("#monthInput").value}_請求書.pdf`)}
  catch(e){$("#pdfStatus").textContent=e.message}
}
$("#downloadAllBtn").onclick=async()=>{
  try{
    await ensurePdfLib(); if(!window.JSZip)throw new Error("ZIP 库加载失败");
    const month=$("#monthInput").value; const names=[...new Set(records.filter(r=>r.date.startsWith(month)).map(r=>r.store))];
    if(!names.length){$("#pdfStatus").textContent="这个月没有记录。";return}
    $("#pdfStatus").textContent="正在生成全部 PDF…";
    const zip=new JSZip();
    for(const name of names){const pdf=await buildPdf(name);zip.file(`${safeName(name)}_${month}_請求書.pdf`,pdf.output("arraybuffer"))}
    const blob=await zip.generateAsync({type:"blob"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`請求書_${month}_全部.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    $("#pdfStatus").textContent=`已生成 ${names.length} 家店的 PDF。`;
  }catch(e){$("#pdfStatus").textContent=e.message}
};
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function attr(v){return esc(v)}
