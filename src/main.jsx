import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './styles.css';
import PageSeo from './PageSeo.jsx';
import ShareProduct from './ShareProduct.jsx';
import { brand, heroImage, aisles, productImage, sampleProducts, bank } from './media.js';
import { assistantReply } from './assistant.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const configured = Boolean(url && key && !url.includes('your-project'));
const supabase = configured ? createClient(url, key) : null;
const Auth = createContext(null); const Cart = createContext(null);
const money = n => new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(n || 0));
const dateTime = d => d ? new Date(d).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'}) : 'To be arranged';
const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

function AuthProvider({children}) {
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true);
  const loadProfile=async sess=>{
    if(!sess){ setProfile(null); return; }
    const {data}=await supabase.from('profiles').select('*').eq('id',sess.user.id).single();
    setProfile(data);
  };
  useEffect(()=>{
    if(!supabase){ setLoading(false); return; }
    let active=true;
    (async()=>{
      const {data}=await supabase.auth.getSession();
      if(!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      if(active) setLoading(false);
    })();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_e,next)=>{
      setSession(next);
      await loadProfile(next);
    });
    return ()=>{ active=false; subscription.unsubscribe(); };
  },[]);
  return <Auth.Provider value={{session,profile,loading,refreshProfile:()=>loadProfile(session),signOut:()=>supabase.auth.signOut()}}>{children}</Auth.Provider> }
function CartProvider({children}) { const [items,setItems]=useState(()=>JSON.parse(localStorage.getItem('coral-cart')||'[]')); useEffect(()=>localStorage.setItem('coral-cart',JSON.stringify(items)),[items]);
 const add=p=>setItems(x=>{const found=x.find(i=>i.id===p.id); return found?x.map(i=>i.id===p.id?{...i,quantity:i.quantity+1}:i):[...x,{...p,quantity:1}]});
 const update=(id,q)=>setItems(x=>q<1?x.filter(i=>i.id!==id):x.map(i=>i.id===id?{...i,quantity:q}:i)); return <Cart.Provider value={{items,add,update,clear:()=>setItems([])}}>{children}</Cart.Provider> }
function useAuth(){return useContext(Auth)} function useCart(){return useContext(Cart)}

let headerProducts = null; // cached so the catalogue loads once, not on every navigation

function NotificationBell(){
  const {session}=useAuth(); const nav=useNavigate();
  const [items,setItems]=useState([]); const [open,setOpen]=useState(false);
  const boxRef=useRef(null);
  const unread=items.reduce((a,n)=>a+(n.read?0:1),0);
  useEffect(()=>{
    if(!supabase||!session){ setItems([]); return; }
    let active=true; const uid=session.user.id;
    (async()=>{
      const {data}=await supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(20);
      if(active&&data) setItems(data);
    })();
    const ch=supabase.channel('notif-'+uid)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+uid},
        payload=>setItems(x=>x.some(n=>n.id===payload.new.id)?x:[payload.new,...x].slice(0,20)))
      .subscribe();
    return ()=>{ active=false; supabase.removeChannel(ch); };
  },[session]);
  useEffect(()=>{
    const onDoc=e=>{ if(boxRef.current&&!boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown',onDoc); return ()=>document.removeEventListener('mousedown',onDoc);
  },[]);
  const markAll=async()=>{ setItems(x=>x.map(n=>({...n,read:true}))); if(supabase) await supabase.rpc('mark_notifications_read',{p_ids:null}); };
  const openOne=n=>{
    setOpen(false);
    if(!n.read){ setItems(x=>x.map(m=>m.id===n.id?{...m,read:true}:m)); if(supabase) supabase.rpc('mark_notifications_read',{p_ids:[n.id]}); }
    if(n.link) nav(n.link);
  };
  if(!session) return null;
  return <div className="notif" ref={boxRef}>
    <button type="button" className="notif-bell" aria-label={'Notifications'+(unread?', '+unread+' unread':'')} aria-haspopup="true" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      {unread>0&&<span className="notif-badge">{unread>9?'9+':unread}</span>}
    </button>
    {open&&<div className="notif-panel" role="menu">
      <div className="notif-head"><strong>Notifications</strong>{unread>0&&<button type="button" className="link-button" onClick={markAll}>Mark all read</button>}</div>
      {items.length===0
        ? <p className="notif-empty">You are all caught up.</p>
        : <ul className="notif-list">{items.map(n=>
            <li key={n.id} className={n.read?'':'unread'}>
              <button type="button" onClick={()=>openOne(n)}>
                <span className="notif-title">{n.title}</span>
                {n.body&&<span className="notif-body">{n.body}</span>}
                <span className="notif-time">{dateTime(n.created_at)}</span>
              </button>
            </li>)}</ul>}
      <PushToggle/>
    </div>}
  </div>;
}
function urlB64ToUint8(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64); const arr=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
  return arr;
}
function PushToggle(){
  const {session}=useAuth();
  const supported=typeof navigator!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  const [state,setState]=useState('off'); // off | on | busy | denied
  useEffect(()=>{
    if(!supported||!session||!vapidKey) return;
    let active=true;
    navigator.serviceWorker.ready
      .then(reg=>reg.pushManager.getSubscription())
      .then(sub=>{ if(active) setState(sub?'on':(Notification.permission==='denied'?'denied':'off')); })
      .catch(()=>{});
    return ()=>{ active=false; };
  },[session]);
  if(!supported||!session||!vapidKey) return null;
  const enable=async()=>{
    setState('busy');
    try{
      const perm=await Notification.requestPermission();
      if(perm!=='granted'){ setState(perm==='denied'?'denied':'off'); return; }
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64ToUint8(vapidKey)});
      const j=sub.toJSON();
      const {error}=await supabase.from('push_subscriptions').upsert({endpoint:sub.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth},{onConflict:'endpoint'});
      setState(error?'off':'on');
    }catch(e){ setState('off'); }
  };
  const disable=async()=>{
    setState('busy');
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(sub){ await supabase.from('push_subscriptions').delete().eq('endpoint',sub.endpoint); await sub.unsubscribe(); }
      setState('off');
    }catch(e){ setState('on'); }
  };
  return <div className="notif-push">
    {state==='denied'
      ? <span className="notif-push-note">Device alerts are blocked in your browser settings.</span>
      : state==='on'
        ? <button type="button" className="link-button" onClick={disable}>Turn off device alerts</button>
        : <button type="button" className="link-button" onClick={enable} disabled={state==='busy'}>{state==='busy'?'Working...':'Turn on device alerts'}</button>}
  </div>;
}
function Header({navOpen,onToggle}){
  const {session,profile,signOut}=useAuth();
  const {items}=useCart();
  const nav=useNavigate();
  const [q,setQ]=useState('');
  const [catalogue,setCatalogue]=useState(headerProducts||[]);
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(-1);
  const boxRef=useRef(null);
  useEffect(()=>{
    if(headerProducts){ setCatalogue(headerProducts); return; }
    if(!supabase){ headerProducts=sampleProducts; setCatalogue(sampleProducts); return; }
    supabase.from('products').select('id,name,slug,price,image_url,stock_quantity,category:categories(name,slug)').eq('is_active',true).limit(300).then(({data})=>{ if(data&&data.length){ headerProducts=data; setCatalogue(data); } });
  },[]);
  useEffect(()=>{
    const onDoc=e=>{ if(boxRef.current&&!boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown',onDoc);
    return ()=>document.removeEventListener('mousedown',onDoc);
  },[]);
  const term=q.trim().toLowerCase();
  const results=term?catalogue.filter(p=>((p.name||'')+' '+(p.category?.name||'')).toLowerCase().includes(term)).slice(0,6):[];
  const close=()=>{ setOpen(false); setActive(-1); };
  const goSearch=e=>{ if(e&&e.preventDefault) e.preventDefault(); const query=q.trim(); close(); if(query) nav('/products?q='+encodeURIComponent(query)); };
  const goProduct=p=>{ setQ(''); close(); nav('/products/'+(p.slug||p.id)); };
  const onKey=e=>{
    if(!open||!results.length){ if(e.key==='ArrowDown'&&results.length){ e.preventDefault(); setOpen(true); setActive(0); } return; }
    if(e.key==='ArrowDown'){ e.preventDefault(); setActive(a=>Math.min(a+1,results.length-1)); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setActive(a=>Math.max(a-1,-1)); }
    else if(e.key==='Enter'&&active>=0){ e.preventDefault(); goProduct(results[active]); }
    else if(e.key==='Escape'){ close(); }
  };
  return (
    <header>
      <button className="menu-toggle" aria-label="Toggle menu" aria-expanded={navOpen} onClick={onToggle}>
        <span></span><span></span><span></span>
      </button>
      <Link className="brand" to="/">
        <img src={brand.logo} alt="Coral Shopping" />
      </Link>
      <form className="search" onSubmit={goSearch} role="search" ref={boxRef}>
        <input type="search" placeholder="Search rice, oil, gifts" value={q}
          onChange={e=>{ setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={()=>{ if(q.trim()) setOpen(true); }}
          onKeyDown={onKey}
          role="combobox" aria-expanded={open&&results.length>0} aria-controls="search-suggest" aria-autocomplete="list" autoComplete="off" aria-label="Search products" />
        {open&&results.length>0&&<ul className="search-suggest" id="search-suggest" role="listbox">
          {results.map((p,i)=>(
            <li key={p.id||p.slug} role="option" aria-selected={i===active} className={i===active?'active':''}>
              <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>goProduct(p)}>
                <img src={productImage(p)} alt="" loading="lazy"/>
                <span className="ss-name">{p.name}</span>
                <span className="ss-price">{money(p.price)}</span>
              </button>
            </li>
          ))}
          <li className="search-suggest-all"><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>goSearch()}>See all results for "{q.trim()}"</button></li>
        </ul>}
        {open&&term&&results.length===0&&catalogue.length>0&&<ul className="search-suggest" role="listbox"><li className="search-suggest-empty">No matches. Press Enter to search everything.</li></ul>}
      </form>
      <div className="header-actions">
        <NotificationBell/>
        {(() => { const count = items.reduce((a,i)=>a+i.quantity,0); return <Link to="/checkout">Cart <b key={count} className={count>0?'cart-count':''}>{count}</b></Link>; })()}
        {session?<button className="link-button" onClick={signOut}>Sign out</button>:<Link className="button small" to="/sign-in">Sign in</Link>}
      </div>
    </header>
  );
}
function Footer(){
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <img className="footer-logo" src={brand.logo} alt="Coral Shopping" />
          <p className="footer-tag">Quality foodstuffs, gift hampers and household essentials, delivered across Abeokuta.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/products">All products</Link>
          <a href="/#aisles">Shop by aisle</a>
          <a href="/#custom-shop">Custom shop</a>
          <a href="https://wa.me/2349061965441" target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
        <div>
          <h4>Contact</h4>
          <p><a href="tel:+2349061965441">0906 196 5441</a></p>
          <p><a href="mailto:kehindebolatito@gmail.com">kehindebolatito@gmail.com</a></p>
          <a className="button secondary" href="https://wa.me/2349061965441" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
        </div>
        <div>
          <h4>Coral Shopping</h4>
          <a href="https://coral-shopping.netlify.app/">About us</a>
          <a href="https://coral-shopping.netlify.app/#faq">FAQs</a>
          <a href="https://coral-shopping.netlify.app/terms.html">Terms and Conditions</a>
          <a href="https://coral-shopping.netlify.app/privacy.html">Privacy Policy</a>
        </div>
      </div>
      <div className="footer-base">© {new Date().getFullYear()} Coral Shopping. All rights reserved.</div>
    </footer>
  );
}
function ChatLauncher(){
  const {items,add}=useCart();
  const [open,setOpen]=useState(false);
  const [showPopup,setShowPopup]=useState(()=>{ try { return localStorage.getItem('coral-chat-popup')!=='hidden'; } catch { return true; } });
  const [messages,setMessages]=useState([{role:'bot',text:"Hi, I'm here for Coral Shopping. Ask me about prices, what's in stock, delivery, or payment, and I'll sort you out."}]);
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [products,setProducts]=useState(sampleProducts);
  const bodyRef=useRef(null);
  const suggestions=['What do you sell?','How much is rice?','I need a gift hamper','How does delivery work?','Add rice to my cart'];
  useEffect(()=>{ if(supabase){ supabase.from('products').select('*, category:categories(name,slug)').eq('is_active',true).order('created_at',{ascending:false}).then(({data})=>{ if(data&&data.length) setProducts(data); }); } },[]);
  useEffect(()=>{ if(bodyRef.current) bodyRef.current.scrollTop=bodyRef.current.scrollHeight; },[messages,open,busy]);
  const dismissPopup=()=>{ setShowPopup(false); try { localStorage.setItem('coral-chat-popup','hidden'); } catch {} };
  const openChat=()=>{ setShowPopup(false); setOpen(true); };
  const send=async raw=>{
    const text=(raw||'').trim(); if(!text||busy) return;
    setInput('');
    const history=[...messages, {role:'user', text}].map(m=>({role: m.role==='user'?'user':'assistant', content: m.text}));
    setMessages(m=>[...m,{role:'user',text}]); setBusy(true);
    const reply=await assistantReply(text,{catalog:products, history, supabase, cart:items});
    if(reply.add) add(reply.add);
    setMessages(m=>[...m,{role:'bot',text:reply.text,products:reply.products}]);
    setBusy(false);
  };
  return (
    <>
      {!open && showPopup && <div className="chat-popup" role="dialog" aria-label="Coral assistant">
        <button className="chat-popup-close" aria-label="Dismiss" onClick={dismissPopup}>×</button>
        <p>Hi! I am Coral's shopping assistant. Ask me about prices, stock, delivery or how to pay.</p>
        <button className="chat-popup-open" onClick={openChat}>Chat with me</button>
      </div>}
      {!open && <button className="chat-fab" aria-label="Open chat" onClick={openChat}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/></svg>
      </button>}
      {open && <section className="chat-panel" aria-label="Coral Shopping assistant">
        <header className="chat-header">
          <img src={brand.logo} alt="Coral Shopping" />
          <div><strong>Coral Assistant</strong><small>Online now</small></div>
          <button className="chat-close" aria-label="Close chat" onClick={()=>setOpen(false)}>×</button>
        </header>
        <div className="chat-body" ref={bodyRef}>
          {messages.map((m,idx)=>(
            <div key={idx} className={'chat-msg '+(m.role==='user'?'user':'bot')}>
              <div className="bubble">{m.text}</div>
              {m.products&&<div className="chat-products">
                {m.products.map(p=><div className="chat-product" key={p.id||p.name}>
                  <img src={productImage(p)} alt={p.name||''} loading="lazy"/>
                  <div><span>{p.name}</span><small>{money(p.price)}</small></div>
                  <button onClick={e=>{add(p);flyToCart(e.currentTarget)}}>Add</button>
                </div>)}
              </div>}
            </div>
          ))}
          {busy && <div className="chat-msg bot"><div className="bubble typing"><span></span><span></span><span></span></div></div>}
        </div>
        {messages.length<=1 && <div className="chat-suggestions">
          {suggestions.map(s=><button key={s} onClick={()=>send(s)}>{s}</button>)}
        </div>}
        <form className="chat-input" onSubmit={e=>{e.preventDefault();send(input)}}>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about a product or delivery" aria-label="Message"/>
          <button type="submit" aria-label="Send" disabled={busy||!input.trim()}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </form>
      </section>}
    </>
  );
}
function Icon({name}){
  const paths={
    home:<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    bag:<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
    box:<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    grid:<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    sliders:<><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
    external:<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    chevron:<><polyline points="15 18 9 12 15 6"/></>,
    user:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    plus:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    chart:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Sidebar({close,collapsed,onCollapse}){
  const {session,profile}=useAuth();
  return (
    <aside className="shop-sidebar">
      <div className="ss-head">
        <button className="ss-collapse" onClick={onCollapse} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} aria-pressed={collapsed} title={collapsed?'Expand sidebar':'Collapse sidebar'}><Icon name="chevron"/></button>
        <Link className="ss-brand" to="/" onClick={close}><img src={brand.logo} alt="Coral Shopping"/></Link>
      </div>
      <nav className="ss-nav">
        <p className="ss-label">Browse</p>
        <NavLink to="/" end onClick={close} data-tooltip="Home"><span className="ss-ico"><Icon name="home"/></span><span className="ss-txt">Home</span></NavLink>
        <NavLink to="/products" onClick={close} data-tooltip="Shop"><span className="ss-ico"><Icon name="bag"/></span><span className="ss-txt">Shop</span></NavLink>
        {session&&<NavLink to="/orders" onClick={close} data-tooltip="Orders"><span className="ss-ico"><Icon name="box"/></span><span className="ss-txt">Orders</span></NavLink>}
        {session&&<NavLink to="/dashboard" onClick={close} data-tooltip="Dashboard"><span className="ss-ico"><Icon name="grid"/></span><span className="ss-txt">Dashboard</span></NavLink>}
        {profile?.role==='admin'&&<NavLink to="/admin" onClick={close} data-tooltip="Admin"><span className="ss-ico"><Icon name="sliders"/></span><span className="ss-txt">Admin</span></NavLink>}
      </nav>
      <div className="ss-foot"><a href="/" className="ss-site" data-tooltip="Main site"><span className="ss-ico"><Icon name="external"/></span><span className="ss-txt">Main site</span></a></div>
    </aside>
  );
}
function Layout({children}){
  const [navOpen,setNavOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem('coral_sidebar_collapsed')==='1'}catch(e){return false}});
  const close=()=>setNavOpen(false);
  const toggleCollapse=()=>setCollapsed(c=>{const n=!c;try{localStorage.setItem('coral_sidebar_collapsed',n?'1':'0')}catch(e){}return n});
  return (
    <div className={'app-shell'+(navOpen?' nav-open':'')+(collapsed?' sidebar-collapsed':'')}>
      <Sidebar close={close} collapsed={collapsed} onCollapse={toggleCollapse}/>
      <div className="ss-backdrop" onClick={close}></div>
      <div className="main-col">
        <Header navOpen={navOpen} onToggle={()=>setNavOpen(o=>!o)}/>
        <main>{children}</main>
        <Footer/>
      </div>
      <ChatLauncher/>
    </div>
  );
}
function Notice({children,kind='info'}){return <div className={'notice '+kind}>{children}</div>}

// Animates a small dot from the clicked button to the cart in the header.
function flyToCart(fromEl){
  if(!fromEl||typeof document==='undefined') return;
  const target=document.querySelector('.header-actions a[href$="/checkout"]');
  if(!target) return;
  const a=fromEl.getBoundingClientRect(), b=target.getBoundingClientRect();
  const dot=document.createElement('div');
  dot.className='fly-dot';
  dot.style.left=(a.left+a.width/2-8)+'px';
  dot.style.top=(a.top+a.height/2-8)+'px';
  document.body.appendChild(dot);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    dot.style.transform=`translate(${b.left+b.width/2-(a.left+a.width/2)}px,${b.top+b.height/2-(a.top+a.height/2)}px) scale(.2)`;
    dot.style.opacity='.25';
  }));
  setTimeout(()=>dot.remove(),750);
}

// Vertical, aligned bank details with a click-to-copy account number.
function BankDetails({amount}){
  const [copied,setCopied]=useState(false);
  const copy=async()=>{
    try { await navigator.clipboard.writeText(bank.account); }
    catch {
      const ta=document.createElement('textarea');
      ta.value=bank.account;
      ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(()=>setCopied(false),2200);
  };
  return (
    <div className="bank-details card">
      {amount!=null&&<div className="bank-row"><span>Amount to send</span><b>{money(amount)}</b></div>}
      <div className="bank-row"><span>Bank</span><b>{bank.name}</b></div>
      <div className="bank-row"><span>Account number</span><button type="button" className={'copy-account'+(copied?' copied':'')} onClick={copy} title="Click to copy"><b>{bank.account}</b><em>{copied?'Copied!':'Copy'}</em></button></div>
      <div className="bank-row"><span>Account name</span><b>{bank.accountName}</b></div>
    </div>
  );
}

function SignIn(){const nav=useNavigate();const [mode,setMode]=useState('signIn'),[form,setForm]=useState({name:'',email:'',password:''}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);if(!configured)return <Setup/>; const submit=async e=>{e.preventDefault();setBusy(true);setMsg('');let result;if(mode==='signIn')result=await supabase.auth.signInWithPassword({email:form.email,password:form.password});else result=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{full_name:form.name},emailRedirectTo:window.location.origin+import.meta.env.BASE_URL}});setBusy(false);if(result.error)return setMsg(result.error.message);if(mode==='signUp')setMsg('Check your email to confirm your account, then sign in.');else nav('/products')}; return <Layout><section className="auth card"><p className="eyebrow">Your account</p><h1>{mode==='signIn'?'Welcome back':'Create your account'}</h1><p>Sign in is required before checkout so you can track your order and delivery.</p>{msg&&<Notice kind={msg.includes('Check')?'success':'error'}>{msg}</Notice>}<form onSubmit={submit}>{mode==='signUp'&&<label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}<label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Password<input type="password" minLength="8" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><button disabled={busy}>{busy?'Please wait…':mode==='signIn'?'Sign in':'Create account'}</button></form><button className="link-button" onClick={()=>{setMode(mode==='signIn'?'signUp':'signIn');setMsg('')}}>{mode==='signIn'?'New here? Create an account':'Already have an account? Sign in'}</button></section></Layout>}
function Setup(){return <Layout><section className="card setup"><h1>Connect Coral Shop to Supabase</h1><p>This secure rebuild requires your free Supabase project credentials.</p><ol><li>Create a free project at Supabase.</li><li>Run <code>supabase/schema.sql</code> in its SQL Editor.</li><li>Copy <code>.env.example</code> to <code>.env</code> and add its Project URL and anon key.</li><li>Restart the app, create an account, then promote your first admin using the README instructions.</li></ol></section></Layout>}
function Products({featured=false}){const [products,setProducts]=useState([]),[category,setCategory]=useState('all'),[loading,setLoading]=useState(true);const [params,setParams]=useSearchParams();const {add}=useCart();const [addedNotice,setAddedNotice]=useState('');const q=(params.get('q')||'').toLowerCase().trim();useEffect(()=>{if(!supabase){setProducts(sampleProducts);setLoading(false);return;}supabase.from('products').select('*, category:categories(name,slug)').eq('is_active',true).order('created_at',{ascending:false}).then(({data,error})=>{if(error)console.error(error);setProducts(data||[]);setLoading(false)})},[]);useEffect(()=>{const addFragment=params.get('add');if(!addFragment||!products.length)return;const target=products.find(p=>p.name&&p.name.toLowerCase().includes(addFragment.toLowerCase()));if(target){add(target);setAddedNotice(`${target.name} was added to your cart.`);}else{setAddedNotice(`We couldn't find "${addFragment}" in the catalog right now.`);}const next=new URLSearchParams(params);next.delete('add');setParams(next,{replace:true});},[products]);let list=category==='all'?products:products.filter(p=>p.category?.slug===category);if(q)list=list.filter(p=>(p.name+' '+(p.description||'')+' '+(p.category?.name||'')).toLowerCase().includes(q));list=list.slice(0,featured?4:100); return <section className="section"><div className="section-title"><div><p className="eyebrow">{featured?'Best sellers':'Catalog'}</p>{featured?<h2>Popular essentials</h2>:<h1>Shop everything</h1>}</div>{featured&&<Link to="/products">Browse all products →</Link>}</div>{addedNotice&&<Notice kind="success">{addedNotice}</Notice>}{!featured&&<div className="chips">{['all','foodstuffs','gifts','household'].map(x=><button className={category===x?'selected':''} onClick={()=>setCategory(x)} key={x}>{x}</button>)}</div>}{loading?<p>Loading products…</p>:<div className="products">{list.map(p=><ProductCard key={p.id} product={p}/>)}</div>}{!loading&&!list.length&&<Notice>{q?'No products match your search. Try another term.':'No products are available yet. Import the product CSV from the Supabase Table Editor.'}</Notice>}</section>}
function QuantityStepper({quantity,onDecrease,onIncrease,atLimit}){
  return <div className="qty-stepper">
    <button type="button" className="qty-btn" onClick={onDecrease} aria-label="Decrease quantity">−</button>
    <span className="qty-value">{quantity}</span>
    <button type="button" className="qty-btn" onClick={onIncrease} aria-label="Increase quantity" disabled={atLimit} title={atLimit?'No more in stock':undefined}>+</button>
  </div>;
}
function ProductCard({product}){
  const {items,add,update}=useCart();
  const inCart=items.find(i=>i.id===product.id);
  const qty=inCart?inCart.quantity:0;
  const outOfStock=product.stock_quantity<1;
  const atLimit=product.stock_quantity>0 && qty>=product.stock_quantity;
  const onAdd=e=>{ if(outOfStock) return; add(product); flyToCart(e.currentTarget); };
  const onIncrease=e=>{ if(atLimit) return; add(product); flyToCart(e.currentTarget); };
  const onDecrease=()=>update(product.id,qty-1);
  return <article className="product card">
    <Link to={`/products/${product.slug||product.id}`} className="product-media-link">
      <div className="product-media"><img src={productImage(product)} alt={product.name||''} loading="lazy"/></div>
    </Link>
    <div>
      <small>{product.category?.name||'Essentials'}</small>
      <h3><Link to={`/products/${product.slug||product.id}`}>{product.name}</Link></h3>
      <p>{product.description}</p>
      <div className="product-bottom">
        <strong>{money(product.price)}</strong>
        <div className="product-cart-actions">
          {outOfStock
            ? <button disabled>Out of stock</button>
            : qty>0
              ? <QuantityStepper quantity={qty} onDecrease={onDecrease} onIncrease={onIncrease} atLimit={atLimit}/>
              : <button onClick={onAdd}>Add to cart</button>}
          {!outOfStock&&qty===0&&<ShareProduct product={product}/>}
        </div>
      </div>
    </div>
  </article>;
}

function ProductDetail(){
  const {slug}=useParams();
  const navigate=useNavigate();
  const {items,add,update}=useCart();
  const [product,setProduct]=useState(null);
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);
  useEffect(()=>{
    let active=true;
    setLoading(true); setNotFound(false); setProduct(null);
    if(!supabase){
      const match=sampleProducts.find(p=>p.slug===slug||p.id===slug);
      if(match){ setProduct(match); } else { setNotFound(true); }
      setLoading(false);
      return;
    }
    const column=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(slug)?'id':'slug';
    supabase.from('products').select('*, category:categories(name,slug)').eq('is_active',true).eq(column,slug).maybeSingle().then(({data,error})=>{
      if(!active)return;
      if(error||!data){ setNotFound(true); setLoading(false); return; }
      setProduct(data); setLoading(false);
    });
    return ()=>{active=false;};
  },[slug]);
  const inCart=product&&items.find(i=>i.id===product.id);
  const qty=inCart?inCart.quantity:0;
  const outOfStock=product&&product.stock_quantity<1;
  const atLimit=product&&product.stock_quantity>0&&qty>=product.stock_quantity;
  const onAdd=e=>{ if(outOfStock) return; add(product); flyToCart(e.currentTarget); };
  const onIncrease=e=>{ if(atLimit) return; add(product); flyToCart(e.currentTarget); };
  const onDecrease=()=>update(product.id,qty-1);
  if(loading) return <Layout><section className="section"><p>Loading…</p></section></Layout>;
  if(notFound) return <Layout><section className="section"><h1>Product not found</h1><Notice kind="error">We couldn't find that product.</Notice><Link to="/products">← Back to shop</Link></section></Layout>;
  return <Layout>
    <section className="section product-detail">
      <Link to="/products" className="back-link">← Back to shop</Link>
      <div className="product-detail-grid">
        <div className="product-detail-media"><img src={productImage(product)} alt={product.name||''} width="600" height="600" fetchPriority="high"/></div>
        <div className="product-detail-info">
          <small>{product.category?.name||'Essentials'}</small>
          <h1>{product.name}</h1>
          <strong className="product-detail-price">{money(product.price)}</strong>
          <p className="product-detail-desc">{product.description}</p>
          {outOfStock
            ? <p className="product-detail-stock out">Out of stock</p>
            : <p className="product-detail-stock">{product.stock_quantity} in stock</p>}
          <div className="product-detail-action">
            <div className="product-cart-actions">
              {outOfStock
                ? <button disabled>Out of stock</button>
                : qty>0
                  ? <QuantityStepper quantity={qty} onDecrease={onDecrease} onIncrease={onIncrease} atLimit={atLimit}/>
                  : <button onClick={onAdd}>Add to cart</button>}
              {!outOfStock&&qty===0&&<ShareProduct key={product.id} product={product}/>}
            </div>
            {qty>0&&<Link to="/checkout" className="button secondary">Go to checkout</Link>}
          </div>
        </div>
      </div>
    </section>
  </Layout>;
}
function CustomShopForm(){
  const {session,profile}=useAuth();
  const [form,setForm]=useState({name:profile?.full_name||'',phone:profile?.phone||'',items:'',budget:''});
  const [msg,setMsg]=useState('');
  const [kind,setKind]=useState('info');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{setForm(f=>({...f,name:profile?.full_name||f.name,phone:profile?.phone||f.phone}));},[session,profile]);
  const submit=async e=>{
    e.preventDefault();
    if(!session) return;
    setBusy(true); setMsg('');
    const {error}=await supabase.from('custom_requests').insert({
      user_id:session.user.id,
      name:form.name.trim(),
      phone:form.phone.trim(),
      items:form.items.trim(),
      budget:form.budget.trim()||null
    });
    setBusy(false);
    if(error){ setKind('error'); return setMsg(error.message); }
    setKind('success');
    setMsg("Request submitted successfully! We'll contact you soon. You can track its status from your Dashboard.");
    setForm({name:profile?.full_name||'',phone:profile?.phone||'',items:'',budget:''});
  };
  return (
    <section className="custom-shop" id="custom-shop">
      <div className="inner">
        <div className="custom-copy">
          <p className="eyebrow">Shop your way</p>
          <h2>Tell us what you need</h2>
          <p>Cannot find it in the catalog? Share your list and budget and we will help you source it.</p>
        </div>
        <div className="custom-grid">
          <div>
            {!session&&<Notice>Sign in is required to send a custom shopping request. <Link to="/sign-in">Sign in</Link></Notice>}
            {msg&&<Notice kind={kind}>{msg}</Notice>}
            <form className="card" onSubmit={submit}>
              <label>Your name<input required maxLength="80" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
              <label>Phone number<input type="tel" required maxLength="20" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
              <label>What items do you need?<textarea required maxLength="2000" value={form.items} onChange={e=>setForm({...form,items:e.target.value})}/></label>
              <label>Your budget (optional)<input maxLength="80" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/></label>
              <button disabled={busy||!session}>{busy?'Submitting...':'Submit request'}</button>
            </form>
          </div>
          <img className="hamper-photo" src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=700&h=820&fit=crop" alt="Coral Shopping gift hamper" loading="lazy"/>
        </div>
      </div>
    </section>
  );
}
function AisleCards(){
  return (
    <section className="section" id="aisles">
      <div className="section-title"><div><p className="eyebrow">Shop by aisle</p><h2>Start where you usually do</h2></div></div>
      <div className="aisles">
        {aisles.map(a=><Link className="aisle card" to={'/products?q='+encodeURIComponent(a.name)} key={a.name}>
          <div className="aisle-media"><img src={a.image} alt={a.name} loading="lazy"/></div>
          <div className="aisle-body"><h3>{a.name}</h3><p>{a.blurb}</p><span className="aisle-link">Shop {a.name.toLowerCase()} →</span></div>
        </Link>)}
      </div>
    </section>
  );
}
function Home(){return <Layout><section className="hero"><div className="hero-copy"><p className="eyebrow">Abeokuta grocery and gift store</p><h1>Quality foodstuffs, gifts and household essentials, delivered to your door.</h1><p>Coral Shopping brings the market to you. Stock your kitchen, send a gift hamper, or tell us what you need and we will source it for you.</p><div className="hero-actions"><Link className="button" to="/products">Shop now</Link><a className="button secondary" href="#custom-shop">Shop your way</a></div></div><div className="hero-art"><img src={heroImage} alt="Coral Shopping groceries and household items" width="1200" height="800" fetchPriority="high"/></div></section><AisleCards/><Products featured/><CustomShopForm/><section className="callout"><div><p className="eyebrow">Need a hand?</p><h2>Chat with us on WhatsApp for quick orders and delivery questions.</h2></div><a className="button secondary" href="https://wa.me/2349061965441" target="_blank" rel="noreferrer">Chat on WhatsApp</a></section></Layout>}
function RequireAuth({children}){const {session,loading}=useAuth();if(loading)return <Layout><p>Loading…</p></Layout>;return session?children:<Navigate to="/sign-in" replace/>}
function Checkout(){const {items,update,clear}=useCart();const {profile}=useAuth();const nav=useNavigate();const [shipping,setShipping]=useState({name:profile?.full_name||'',phone:profile?.phone||'',address:'',city:'Abeokuta',state:'Ogun'}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);const subtotal=items.reduce((s,i)=>s+i.price*i.quantity,0),fee=2000;const submit=async e=>{e.preventDefault();if(!items.length)return;setBusy(true);const {data,error}=await supabase.rpc('create_order',{items:items.map(i=>({productId:i.id,quantity:i.quantity})),shipping});setBusy(false);if(error)return setMsg(error.message);clear();nav(`/orders?created=${data}`)};return <RequireAuth><Layout><section className="checkout"><div><p className="eyebrow">Delivery details</p><h1>Where should we deliver?</h1>{msg&&<Notice kind="error">{msg}</Notice>}<form className="card" onSubmit={submit}><div className="two"><label>Full name<input required value={shipping.name} onChange={e=>setShipping({...shipping,name:e.target.value})}/></label><label>Phone<input required value={shipping.phone} onChange={e=>setShipping({...shipping,phone:e.target.value})}/></label></div><label>Delivery address<textarea required value={shipping.address} onChange={e=>setShipping({...shipping,address:e.target.value})}/></label><div className="two"><label>City<input required value={shipping.city} onChange={e=>setShipping({...shipping,city:e.target.value})}/></label><label>State<input required value={shipping.state} onChange={e=>setShipping({...shipping,state:e.target.value})}/></label></div><h3>Payment method</h3><Notice>Pay by bank transfer. Once you place your order, we will show you our account details so you can complete payment and confirm it from your Orders page.</Notice><button disabled={busy||!items.length}>{busy?'Creating order…':'Place order'}</button></form></div><CartSummary items={items} update={update} subtotal={subtotal} fee={fee}/></section></Layout></RequireAuth>}
function CartSummary({items,update,subtotal,fee}){return <aside className="summary card"><div className="summary-body"><h2>Your order</h2>{items.map(i=><div className="line cart-line" key={i.id}><img className="cart-thumb" src={productImage(i)} alt={i.name||''} loading="lazy"/><span className="cart-info">{i.name}<small>{money(i.price)} × <input aria-label="quantity" type="number" min="1" value={i.quantity} onChange={e=>update(i.id,Number(e.target.value))}/></small></span><b>{money(i.price*i.quantity)}</b></div>)}<hr/><div className="line"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="line"><span>Delivery</span><b>{money(fee)}</b></div></div><div className="line total summary-total"><span>Total</span><b>{money(subtotal+fee)}</b></div></aside>}
function OrderThread({orderId,admin}){
  const [open,setOpen]=useState(false),[msgs,setMsgs]=useState([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState('');
  const listRef=useRef(null);
  const load=async()=>{ if(!supabase)return; const {data}=await supabase.from('order_messages').select('*').eq('order_id',orderId).order('created_at',{ascending:true}); setMsgs(data||[]); };
  useEffect(()=>{
    if(!open||!supabase) return;
    load();
    const ch=supabase.channel('omsg-'+orderId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'order_messages',filter:'order_id=eq.'+orderId},
        p=>setMsgs(x=>x.some(m=>m.id===p.new.id)?x:[...x,p.new]))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[open,orderId]);
  useEffect(()=>{ if(open&&listRef.current) listRef.current.scrollTop=listRef.current.scrollHeight; },[msgs,open]);
  const send=async e=>{
    e.preventDefault(); const body=text.trim(); if(!body||busy) return;
    setBusy(true); setErr('');
    const {data,error}=await supabase.from('order_messages').insert({order_id:orderId,body}).select().single();
    setBusy(false);
    if(error){ setErr(error.message); return; }
    setText(''); setMsgs(x=>x.some(m=>m.id===data.id)?x:[...x,data]);
  };
  return <div className="thread">
    <button type="button" className="thread-toggle" onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
      {admin?'Messages with customer':'Message us about this order'}{msgs.length?' ('+msgs.length+')':''}
    </button>
    {open&&<div className="thread-body">
      {msgs.length===0
        ? <p className="thread-empty">{admin?'No messages yet. Reply below to reach the customer.':'Ask a question or send feedback about this order. We will reply right here.'}</p>
        : <ul className="thread-list" ref={listRef}>{msgs.map(m=>{
            const mine=admin?m.from_admin:!m.from_admin;
            return <li key={m.id} className={'thread-msg '+(mine?'mine':'theirs')}>
              <span className="thread-who">{mine?'You':(m.from_admin?'Coral Shopping':'Customer')}</span>
              <span className="thread-text">{m.body}</span>
              <span className="thread-time">{dateTime(m.created_at)}</span>
            </li>;
          })}</ul>}
      {err&&<Notice kind="error">{err}</Notice>}
      <form className="thread-form" onSubmit={send}>
        <textarea rows="2" maxLength="1000" value={text} onChange={e=>setText(e.target.value)} placeholder={admin?'Write a reply…':'Type your message…'}/>
        <button className="button small" type="submit" disabled={busy||!text.trim()}>{busy?'Sending…':'Send'}</button>
      </form>
    </div>}
  </div>;
}
function Orders(){const {session}=useAuth();const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[msg,setMsg]=useState(''),[busy,setBusy]=useState(null);const load=()=>{if(!session)return;supabase.from('orders').select('*, order_items(*)').eq('user_id',session.user.id).order('created_at',{ascending:false}).then(({data,error})=>{setOrders(data||[]);setMsg(error?.message||'');setLoading(false)})};useEffect(load,[session]);const submitted=async id=>{if(busy)return;setBusy(id);const {error}=await supabase.rpc('submit_payment',{order_id:id});setBusy(null);if(error)setMsg(error.message);else {setMsg('Payment submitted. We will confirm it shortly.');load();}};return <RequireAuth><Layout><section className="section"><p className="eyebrow">Your orders</p><h1>My orders</h1>{msg&&<Notice kind={msg.includes('submitted')?'success':'error'}>{msg}</Notice>}{loading?<p>Loading orders…</p>:!orders.length?<Notice>You have no orders yet. <Link to="/products">Start shopping.</Link></Notice>:<div className="orders">{orders.map(o=><article className="order card" key={o.id}><div className="order-head"><div><span className={'status '+o.status}>{o.status.replace('_',' ')}</span><h3>Order #{o.id.slice(0,8)}</h3><small>{dateTime(o.created_at)}</small></div><b>{money(o.total)}</b></div>{o.order_items.map(i=><p key={i.id}>{i.product_name} × {i.quantity} <span>{money(i.line_total)}</span></p>)}<hr/><p><b>Delivery:</b> {o.shipping_address}, {o.shipping_city}, {o.shipping_state}</p>{o.status==='awaiting_payment'&&<><Notice>Make your bank transfer below, then confirm. We will verify the payment before dispatch.</Notice><BankDetails amount={o.total}/><button disabled={busy===o.id} onClick={()=>submitted(o.id)}>{busy===o.id?'Submitting…':"I've made payment"}</button></>}{o.status==='pending'&&<><Notice kind="success">Thanks, we've noted that you have paid. We are verifying the transfer and will schedule delivery shortly. If you still need to complete the payment, the account details are below.</Notice><BankDetails amount={o.total}/></>}{o.delivery_scheduled_at&&<Notice kind="success"><b>Delivery scheduled:</b> {dateTime(o.delivery_scheduled_at)}{o.delivery_note&&` · ${o.delivery_note}`}</Notice>}<OrderThread orderId={o.id}/></article>)}</div>}</section></Layout></RequireAuth>}
function Stars({value,onChange,readOnly}){
  return <span className={'stars'+(readOnly?' readonly':'')} aria-label={(value||0)+' out of 5'}>
    {[1,2,3,4,5].map(n=> onChange
      ? <button type="button" key={n} className={'star'+(n<=value?' on':'')} aria-label={n+(n>1?' stars':' star')} aria-pressed={n===value} onClick={()=>onChange(n)}>★</button>
      : <span key={n} className={'star'+(n<=value?' on':'')} aria-hidden="true">★</span>)}
  </span>;
}
function ReviewCard(){
  const {session}=useAuth();
  const [rating,setRating]=useState(5),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[mine,setMine]=useState([]);
  const load=async()=>{ if(!supabase||!session)return; const {data}=await supabase.from('reviews').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false}); setMine(data||[]); };
  useEffect(()=>{ load(); },[session]);
  const submit=async e=>{
    e.preventDefault(); const text=body.trim();
    if(text.length<4){ setMsg('Please write a little more.'); return; }
    setBusy(true); setMsg('');
    const {error}=await supabase.from('reviews').insert({rating,body:text});
    setBusy(false);
    if(error){ setMsg(error.message); return; }
    setBody(''); setRating(5); setMsg('Thank you! Your review will appear on our site once it is approved.'); load();
  };
  return <div className="dash-col"><h2>Leave a review</h2><article className="order card">
    {msg&&<Notice kind={msg.startsWith('Thank')?'success':'error'}>{msg}</Notice>}
    <form onSubmit={submit}>
      <label>Your rating<Stars value={rating} onChange={setRating}/></label>
      <label>Your review<textarea required maxLength="600" rows="3" value={body} onChange={e=>setBody(e.target.value)} placeholder="Tell others about your experience shopping with us"/></label>
      <button className="button small" type="submit" disabled={busy}>{busy?'Sending…':'Submit review'}</button>
    </form>
    {mine.length>0&&<div className="review-mine"><h4>Your reviews</h4>{mine.map(r=><div key={r.id} className="review-mine-row"><Stars value={r.rating} readOnly/><span className={'review-badge '+r.status}>{r.status}</span></div>)}</div>}
  </article></div>;
}
function ProfileCard(){
  const {session,profile,refreshProfile}=useAuth();
  const [editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');
  const [form,setForm]=useState({full_name:'',phone:''});
  useEffect(()=>{ setForm({full_name:profile?.full_name||'',phone:profile?.phone||''}); },[profile,editing]);
  const save=async e=>{
    e.preventDefault();
    if(!session) return;
    setSaving(true); setMsg('');
    const {data,error}=await supabase.from('profiles').update({full_name:form.full_name.trim(),phone:form.phone.trim()}).eq('id',session.user.id).select();
    setSaving(false);
    if(error){ setMsg(error.message); return; }
    if(!data||!data.length){ setMsg('Could not save your changes. The profile update may not be enabled yet on the database.'); return; }
    await refreshProfile();
    setEditing(false);
  };
  return <div className="dash-col"><h2>Your details</h2><article className="order card">
    {msg&&<Notice kind="error">{msg}</Notice>}
    {!editing?<>
      <p><b>Name:</b> {profile?.full_name||<span className="muted">Not set</span>}</p>
      <p><b>Phone:</b> {profile?.phone||<span className="muted">Not set</span>}</p>
      <p><b>Email:</b> {session?.user?.email}</p>
      <button className="button small" style={{marginTop:14}} onClick={()=>{setMsg('');setEditing(true);}}>Edit details</button>
    </>:<form onSubmit={save}>
      <label>Full name<input type="text" maxLength="80" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label>
      <label>Phone number<input type="tel" maxLength="20" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <p className="muted" style={{fontSize:'.85rem'}}>Your email is tied to your sign-in and cannot be changed here.</p>
      <div className="dash-actions" style={{marginTop:8}}>
        <button className="button small" type="submit" disabled={saving}>{saving?'Saving…':'Save'}</button>
        <button className="button small secondary" type="button" onClick={()=>setEditing(false)}>Cancel</button>
      </div>
    </form>}
  </article></div>;
}
function Dashboard(){
  const {session,profile,signOut}=useAuth();
  const [orders,setOrders]=useState([]);
  const [requests,setRequests]=useState([]);
  const [recs,setRecs]=useState([]);
  const [loading,setLoading]=useState(true);
  const load=async()=>{
    if(!session) return;
    setLoading(true);
    const [oq,rq]=await Promise.all([
      supabase.from('orders').select('*, order_items(*)').eq('user_id',session.user.id).order('created_at',{ascending:false}),
      supabase.from('custom_requests').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false})
    ]);
    if(oq.error) console.error('Failed to load orders:', oq.error);
    if(rq.error) console.error('Failed to load requests:', rq.error);
    setOrders(oq.data||[]);
    setRequests(rq.data||[]);
    setLoading(false);
  };
  useEffect(()=>{ if(!supabase){ setRecs(sampleProducts); return; } supabase.from('products').select('*, category:categories(name,slug)').eq('is_active',true).order('created_at',{ascending:false}).limit(8).then(({data})=>setRecs(data&&data.length?data:sampleProducts)); },[]);
  useEffect(()=>{ if(!supabase){setLoading(false);return;} load(); },[session]);
  const name=profile?.full_name||session?.user?.email?.split('@')[0]||'there';
  const active=orders.filter(o=>!['delivered','closed','cancelled'].includes(o.status)).length;
  return <RequireAuth><Layout><section className="section dashboard">
    <div className="section-title"><div><p className="eyebrow">Your dashboard</p><h1>Welcome back, {name}</h1></div></div>
    <div className="dash-stats">
      <div className="stat card"><span className="stat-ico"><Icon name="box"/></span><div><strong>{orders.length}</strong><span>Orders placed</span></div></div>
      <div className="stat card"><span className="stat-ico"><Icon name="bag"/></span><div><strong>{active}</strong><span>Active orders</span></div></div>
      <div className="stat card"><span className="stat-ico"><Icon name="sliders"/></span><div><strong>{requests.length}</strong><span>Custom requests</span></div></div>
    </div>
    <div className="quick-actions">
      <Link className="qa-tile card" to="/products"><span className="qa-ico"><Icon name="bag"/></span><span className="qa-txt"><strong>Continue shopping</strong><small>Browse the catalogue</small></span></Link>
      <Link className="qa-tile card" to="/orders"><span className="qa-ico"><Icon name="box"/></span><span className="qa-txt"><strong>Track orders</strong><small>Status &amp; delivery</small></span></Link>
      <a className="qa-tile card" href="/#custom-shop"><span className="qa-ico"><Icon name="plus"/></span><span className="qa-txt"><strong>New request</strong><small>Shop Your Way</small></span></a>
      <button className="qa-tile card" onClick={()=>document.getElementById('profile')?.scrollIntoView({behavior:'smooth',block:'start'})}><span className="qa-ico"><Icon name="user"/></span><span className="qa-txt"><strong>Edit profile</strong><small>Your details</small></span></button>
    </div>
    <div className="dash-layout">
      <section className="dash-col dash-main">
        <h2>Recent orders</h2>
        {loading?<p>Loading…</p>:!orders.length?<p className="muted">No orders yet. <Link to="/products">Start shopping.</Link></p>:<>
          <div className="orders">{orders.slice(0,5).map(o=><article className="order card" key={o.id}>
            <div className="order-head"><div><span className={'status '+o.status}>{o.status.replace('_',' ')}</span><h3>Order #{o.id.slice(0,8)}</h3><small>{dateTime(o.created_at)}</small></div><b>{money(o.total)}</b></div>
            <p>{o.order_items?.length||0} item(s)</p>
          </article>)}</div>
          <Link className="button small" to="/orders" style={{marginTop:14}}>View all orders</Link>
        </>}
      </section>
      <aside className="dash-side">
        <div className="dash-col">
          <h2>Your custom requests</h2>
          {loading?<p>Loading…</p>:!requests.length?<p className="muted">Nothing yet. <a href="/#custom-shop">Send a request.</a></p>:<>
            <div className="orders">{requests.slice(0,5).map(r=><article className="order card" key={r.id}>
              <div className="order-head"><div><span className={'status '+r.status}>{r.status}</span><h3>{r.name}</h3><small>{dateTime(r.created_at)}</small></div>{r.budget&&<b>{r.budget}</b>}</div>
              <p style={{display:'block'}}>{(r.items||'').slice(0,90)}{(r.items||'').length>90?'…':''}</p>
            </article>)}</div>
            <a className="button small secondary" href="/#custom-shop" style={{marginTop:14}}>New request</a>
          </>}
        </div>
        <div id="profile"><ProfileCard/></div>
        <ReviewCard/>
      </aside>
    </div>
    <div className="recs-section">
      <div className="section-title"><div><p className="eyebrow">For you</p><h2>Recommended for you</h2></div></div>
      <div className="recs">{recs.slice(0,4).map(p=><ProductCard key={p.id||p.name} product={p}/>)}</div>
    </div>
    <div className="dash-actions">
      <Link className="button" to="/products">Continue shopping</Link>
      <button className="button secondary" onClick={signOut}>Sign out</button>
    </div>
  </section></Layout></RequireAuth>;
}
function Admin(){const {profile}=useAuth();if(profile?.role!=='admin')return <Navigate to="/" replace/>;return <AdminPanel/>}
function AdminPanel(){const [tab,setTab]=useState('overview'),[orders,setOrders]=useState([]),[products,setProducts]=useState([]),[requests,setRequests]=useState([]),[reviews,setReviews]=useState([]),[msg,setMsg]=useState(''),[errors,setErrors]=useState({}),[loading,setLoading]=useState(true);
  const load=async()=>{
    setLoading(true);
    const [oq,pq,rq,vq]=await Promise.all([
      supabase.from('orders').select('*, profiles(full_name,email), order_items(*)').order('created_at',{ascending:false}),
      supabase.from('products').select('*, category:categories(name,slug)').order('created_at',{ascending:false}),
      supabase.from('custom_requests').select('*').order('created_at',{ascending:false}),
      supabase.from('reviews').select('*, product:products(name)').order('created_at',{ascending:false})
    ]);
    setOrders(oq.data||[]); setProducts(pq.data||[]); setRequests(rq.data||[]); setReviews(vq.data||[]);
    setErrors({orders:oq.error?.message||'', products:pq.error?.message||'', custom:rq.error?.message||'', reviews:vq.error?.message||''});
    setLoading(false);
  };
  useEffect(()=>{load()},[]);
  return <Layout><section className="section"><p className="eyebrow">Store control</p><h1>Store control centre</h1><div className="tabs"><button className={tab==='overview'?'selected':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='orders'?'selected':''} onClick={()=>setTab('orders')}>Orders</button><button className={tab==='custom'?'selected':''} onClick={()=>setTab('custom')}>Custom requests</button><button className={tab==='products'?'selected':''} onClick={()=>setTab('products')}>Products</button><button className={tab==='reviews'?'selected':''} onClick={()=>setTab('reviews')}>Reviews{reviews.filter(r=>r.status==='pending').length?' ('+reviews.filter(r=>r.status==='pending').length+')':''}</button></div>{msg&&<Notice kind="success">{msg}</Notice>}{errors[tab]&&<Notice kind="error">{errors[tab]} <button className="link-button" onClick={load}>Try again</button></Notice>}{loading?<p>Loading…</p>:tab==='overview'?<AdminAnalytics orders={orders} products={products} requests={requests} reviews={reviews}/>:tab==='orders'?<AdminOrders orders={orders} reload={load} message={setMsg}/>:tab==='custom'?<AdminCustomRequests requests={requests} reload={load} message={setMsg}/>:tab==='reviews'?<AdminReviews reviews={reviews} reload={load} message={setMsg}/>:<AdminProducts products={products} reload={load} message={setMsg}/>}</section></Layout>}
function AdminAnalytics({orders,products,requests,reviews}){
  const PAID=['paid','processing','shipped','delivered','closed'];
  const paidOrders=orders.filter(o=>PAID.includes(o.status));
  const revenue=paidOrders.reduce((s,o)=>s+Number(o.total||0),0);
  const awaiting=orders.filter(o=>['pending','awaiting_payment'].includes(o.status));
  const pendingRevenue=awaiting.reduce((s,o)=>s+Number(o.total||0),0);
  const aov=paidOrders.length?revenue/paidOrders.length:0;
  const activeCount=orders.filter(o=>!['delivered','closed','cancelled'].includes(o.status)).length;
  const deliveredCount=orders.filter(o=>['delivered','closed'].includes(o.status)).length;
  const now=new Date();
  const months=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:d.getFullYear()+'-'+d.getMonth(),label:d.toLocaleString('en-NG',{month:'short'}),count:0,rev:0});}
  const mIndex={};months.forEach((m,i)=>{mIndex[m.key]=i;});
  orders.forEach(o=>{const d=new Date(o.created_at);const k=d.getFullYear()+'-'+d.getMonth();if(k in mIndex){months[mIndex[k]].count++;if(PAID.includes(o.status))months[mIndex[k]].rev+=Number(o.total||0);}});
  const maxCount=Math.max(1,...months.map(m=>m.count));
  const catOf={};(products||[]).forEach(p=>{catOf[p.id]=p.category?.name||'Uncategorised';});
  const prodMap={},catMap={};
  orders.forEach(o=>(o.order_items||[]).forEach(it=>{
    const name=it.product_name||'Item';
    const rev=Number(it.line_total!=null?it.line_total:(Number(it.unit_price||0)*Number(it.quantity||0)));
    if(!prodMap[name])prodMap[name]={name,qty:0,rev:0};
    prodMap[name].qty+=Number(it.quantity||0);prodMap[name].rev+=rev;
    const cat=(it.product_id&&catOf[it.product_id])||'Other';
    catMap[cat]=(catMap[cat]||0)+rev;
  }));
  const topProducts=Object.values(prodMap).sort((a,b)=>b.rev-a.rev).slice(0,6);
  const maxProdRev=Math.max(1,...topProducts.map(p=>p.rev));
  const cats=Object.entries(catMap).map(([name,rev])=>({name,rev})).sort((a,b)=>b.rev-a.rev);
  const catTotal=cats.reduce((s,c)=>s+c.rev,0)||1;
  const openReq=requests.filter(r=>r.status!=='closed').length;
  const rvBy=s=>reviews.filter(r=>r.status===s).length;
  const approved=reviews.filter(r=>r.status==='approved');
  const avgRating=approved.length?(approved.reduce((s,r)=>s+Number(r.rating||0),0)/approved.length):0;
  if(!orders.length&&!requests.length&&!reviews.length) return <Notice>No data yet. Once orders, requests and reviews start coming in, your analytics will appear here.</Notice>;
  return <div className="analytics">
    <div className="kpi-grid">
      <div className="kpi card"><span className="kpi-label">Revenue (paid)</span><strong>{money(revenue)}</strong><small>{paidOrders.length} paid order(s)</small></div>
      <div className="kpi card"><span className="kpi-label">Awaiting payment</span><strong>{money(pendingRevenue)}</strong><small>{awaiting.length} order(s)</small></div>
      <div className="kpi card"><span className="kpi-label">Total orders</span><strong>{orders.length}</strong><small>{activeCount} active, {deliveredCount} delivered</small></div>
      <div className="kpi card"><span className="kpi-label">Average order value</span><strong>{money(aov)}</strong><small>across paid orders</small></div>
    </div>
    <div className="analytics-grid">
      <div className="panel card">
        <h2>Orders over time</h2>
        <div className="bars">{months.map((m,i)=><div className="bar-col" key={i} title={m.count+' order(s), '+money(m.rev)+' revenue'}>
          <span className="bar-count">{m.count}</span>
          <div className="bar" style={{height:Math.round(6+m.count/maxCount*104)+'px'}}></div>
          <span className="bar-label">{m.label}</span>
        </div>)}</div>
        <p className="muted small-note">Bar height reflects order count. Hover a bar to see revenue.</p>
      </div>
      <div className="panel card">
        <h2>Top products</h2>
        {!topProducts.length?<p className="muted">No items sold yet.</p>:<div className="rankbars">{topProducts.map((p,i)=><div className="rankbar" key={i}>
          <div className="rankbar-head"><span className="rankbar-name">{p.name}</span><b>{money(p.rev)}</b></div>
          <div className="rankbar-track"><div className="rankbar-fill" style={{width:Math.round(p.rev/maxProdRev*100)+'%'}}></div></div>
          <small className="muted">{p.qty} unit(s) sold</small>
        </div>)}</div>}
      </div>
      <div className="panel card">
        <h2>Sales by category</h2>
        {!cats.length?<p className="muted">No sales yet.</p>:<ul className="cat-list">{cats.map((c,i)=><li key={i}><span>{c.name}</span><b>{money(c.rev)}</b><small className="muted">{Math.round(c.rev/catTotal*100)}%</small></li>)}</ul>}
      </div>
      <div className="panel card">
        <h2>Requests &amp; reviews</h2>
        <div className="mini-stats">
          <div><strong>{requests.length}</strong><span>Custom requests</span></div>
          <div><strong>{openReq}</strong><span>Open requests</span></div>
          <div><strong>{avgRating?avgRating.toFixed(1):'-'}</strong><span>Avg rating</span></div>
          <div><strong>{rvBy('pending')}</strong><span>Reviews to moderate</span></div>
        </div>
        <p className="muted small-note">Reviews: {rvBy('approved')} approved, {rvBy('pending')} pending, {rvBy('rejected')} rejected.</p>
      </div>
    </div>
  </div>;
}
function AdminCustomRequests({requests,reload,message}){
  const update=async(id,next_status)=>{
    const {error}=await supabase.from('custom_requests').update({status:next_status}).eq('id',id);
    if(error)return alert(error.message);
    message('Custom request updated.');
    reload();
  };
  if(!requests.length) return <Notice>No custom shopping requests yet.</Notice>;
  return <div className="orders">{requests.map(r=><article className="order card" key={r.id}><div className="order-head"><div><span className={'status '+r.status}>{r.status}</span><h3>{r.name}</h3><small>{r.phone} · {dateTime(r.created_at)}</small></div>{r.budget&&<b>{r.budget}</b>}</div><p style={{display:'block'}}>{r.items}</p><div className="admin-action">{r.status!=='contacted'&&r.status!=='closed'&&<button onClick={()=>update(r.id,'contacted')}>Mark contacted</button>}{r.status!=='closed'&&<button className="secondary" onClick={()=>update(r.id,'closed')}>Mark closed</button>}</div></article>)}</div>;
}
function AdminOrders({orders,reload,message}){const [details,setDetails]=useState({});const confirm=async id=>{const d=details[id]||{};const {error}=await supabase.rpc('confirm_payment',{order_id:id,scheduled_at:d.date?new Date(d.date).toISOString():null,note:d.note||null});if(error)return alert(error.message);message('Payment confirmed and delivery information saved.');reload()};const fulfill=async(id,status)=>{const {error}=await supabase.rpc('update_order_fulfillment',{order_id:id,next_status:status,scheduled_at:null,note:null});if(error)return alert(error.message);message('Order status updated.');reload()};const toLocalInput=iso=>{if(!iso)return '';const d=new Date(iso);const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};const saveSchedule=async o=>{const d=details[o.id]||{};const dateStr=d.date!==undefined?d.date:toLocalInput(o.delivery_scheduled_at);const scheduled=dateStr?new Date(dateStr).toISOString():null;const note=d.note!==undefined?d.note:(o.delivery_note||'');const {error}=await supabase.rpc('set_delivery_schedule',{order_id:o.id,scheduled_at:scheduled,note:note||null});if(error)return alert(error.message);message('Delivery schedule updated.');reload()};if(!orders.length)return <Notice>No orders yet. Orders placed by customers will appear here as soon as they come in.</Notice>;return <div className="orders">{orders.map(o=><article className="order card" key={o.id}><div className="order-head"><div><span className={'status '+o.status}>{o.status.replace('_',' ')}</span><h3>#{o.id.slice(0,8)} · {o.profiles?.full_name||'Customer'}</h3><small>{o.profiles?.email} · {o.shipping_phone}</small></div><b>{money(o.total)}</b></div><p>{o.shipping_address}, {o.shipping_city}, {o.shipping_state}</p>{o.order_items.map(i=><p key={i.id}>{i.product_name} × {i.quantity}</p>)}{o.status==='pending'&&<div className="admin-action"><label>Delivery date & time<input type="datetime-local" onChange={e=>setDetails({...details,[o.id]:{...(details[o.id]||{}),date:e.target.value}})}/></label><label>Delivery note<input placeholder="Optional note" onChange={e=>setDetails({...details,[o.id]:{...(details[o.id]||{}),note:e.target.value}})}/></label><button onClick={()=>confirm(o.id)}>Payment received - mark paid</button></div>}{['paid','processing','shipped'].includes(o.status)&&<div className="admin-action"><button onClick={()=>fulfill(o.id,o.status==='paid'?'processing':o.status==='processing'?'shipped':'delivered')}>Mark {o.status==='paid'?'processing':o.status==='processing'?'shipped':'delivered'}</button>{o.delivery_scheduled_at?<small>Scheduled: {dateTime(o.delivery_scheduled_at)}{o.delivery_note&&` · ${o.delivery_note}`}</small>:<small>No delivery scheduled yet</small>}<details className="sched-edit"><summary>{o.delivery_scheduled_at?'Edit delivery schedule':'Set delivery schedule'}</summary><label>Delivery date & time<input type="datetime-local" defaultValue={toLocalInput(o.delivery_scheduled_at)} onChange={e=>setDetails({...details,[o.id]:{...(details[o.id]||{}),date:e.target.value}})}/></label><label>Delivery note<input placeholder="Optional note" defaultValue={o.delivery_note||''} onChange={e=>setDetails({...details,[o.id]:{...(details[o.id]||{}),note:e.target.value}})}/></label><button onClick={()=>saveSchedule(o)}>Save delivery schedule</button></details></div>}<OrderThread orderId={o.id} admin/></article>)}</div>}
function AdminReviews({reviews,reload,message}){
  const act=async(id,status)=>{const {error}=await supabase.rpc('set_review_status',{p_id:id,p_status:status});if(error)return alert(error.message);message('Review '+status+'.');reload()};
  const remove=async id=>{if(!window.confirm('Delete this review permanently?'))return;const {error}=await supabase.from('reviews').delete().eq('id',id);if(error)return alert(error.message);message('Review deleted.');reload()};
  if(!reviews.length) return <Notice>No reviews yet. Approved reviews appear on the landing page.</Notice>;
  const pending=reviews.filter(r=>r.status==='pending'), rest=reviews.filter(r=>r.status!=='pending');
  const row=r=><article className="order card" key={r.id}>
    <div className="order-head"><div><span className={'review-badge '+r.status}>{r.status}</span><h3>{r.author_name}</h3><small><Stars value={r.rating} readOnly/> · {dateTime(r.created_at)}{r.product?.name?' · '+r.product.name:''}</small></div></div>
    <p style={{display:'block'}}>{r.body}</p>
    <div className="admin-action">
      {r.status!=='approved'&&<button onClick={()=>act(r.id,'approved')}>Approve</button>}
      {r.status!=='rejected'&&<button className="secondary" onClick={()=>act(r.id,'rejected')}>Reject</button>}
      <button className="danger" onClick={()=>remove(r.id)}>Delete</button>
    </div>
  </article>;
  return <div className="orders">
    {pending.length>0&&<><h2 className="admin-subhead">Awaiting approval</h2>{pending.map(row)}</>}
    {rest.length>0&&<><h2 className="admin-subhead">Reviewed</h2>{rest.map(row)}</>}
  </div>;
}
function AdminProducts({products,reload,message}){
  const initial={name:'',price:'',category:'foodstuffs',description:'',image_url:'',stock_quantity:'0'};
  const [form,setForm]=useState(initial);
  const [editing,setEditing]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [uploadError,setUploadError]=useState('');
  const fileInputRef=useRef(null);
  const uploadImage=async e=>{
    const file=e.target.files?.[0];
    if(!file) return;
    setUploadError('');
    if(!file.type.startsWith('image/')){ setUploadError('Please choose an image file.'); return; }
    if(file.size>5*1024*1024){ setUploadError('Image must be under 5MB.'); return; }
    setUploading(true);
    const ext=file.name.split('.').pop();
    const path=`${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const {error}=await supabase.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});
    setUploading(false);
    if(error){ setUploadError(error.message); return; }
    const {data}=supabase.storage.from('product-images').getPublicUrl(path);
    setForm(f=>({...f,image_url:data.publicUrl}));
    if(fileInputRef.current) fileInputRef.current.value='';
  };
  const save=async e=>{e.preventDefault();const {data:cat}=await supabase.from('categories').select('id').eq('slug',form.category).single();const record={name:form.name,slug:slugify(form.name),price:Number(form.price),description:form.description,image_url:form.image_url,stock_quantity:Number(form.stock_quantity),category_id:cat?.id};const result=editing?await supabase.from('products').update(record).eq('id',editing):await supabase.from('products').insert(record);if(result.error)return alert(result.error.message);setForm(initial);setEditing(null);setUploadError('');message('Product saved.');reload()};
  const remove=async id=>{if(!window.confirm('Delete this product? This cannot be undone.'))return;const {error}=await supabase.from('products').delete().eq('id',id);if(error)return alert(error.message);if(editing===id){setEditing(null);setForm(initial);}message('Product deleted.');reload()};
  return <div className="admin-products"><form className="card product-form" onSubmit={save}><h2>{editing?'Edit product':'Add product'}</h2><div className="two"><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Price<input required type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label></div><div className="two"><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['foodstuffs','gifts','household'].map(x=><option key={x}>{x}</option>)}</select></label><label>Stock quantity<input type="number" min="0" value={form.stock_quantity} onChange={e=>setForm({...form,stock_quantity:e.target.value})}/></label></div>
    <label>Product photo
      <div className="image-upload">
        {form.image_url&&<img className="image-upload-preview" src={form.image_url} alt="Product preview"/>}
        <div className="image-upload-controls">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadImage} disabled={uploading}/>
          {uploading&&<small>Uploading…</small>}
          {uploadError&&<small className="image-upload-error">{uploadError}</small>}
        </div>
      </div>
    </label>
    <label>Or paste an image URL<input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://…"/></label>
    <label>Description<textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button disabled={uploading}>{editing?'Save changes':'Add product'}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(null);setForm(initial);setUploadError('')}}>Cancel</button>}</form><div className="product-table card">{products.map(p=><div key={p.id}><img className="admin-thumb" src={productImage(p)} alt={p.name||''} loading="lazy"/><span>{p.name}<small>{p.category?.name} · {p.stock_quantity} in stock</small></span><b>{money(p.price)}</b><div className="row-actions"><button className="secondary" onClick={()=>{setEditing(p.id);setForm({...p,category:p.category?.slug||'foodstuffs'});setUploadError('')}}>Edit</button><button className="danger" onClick={()=>remove(p.id)}>Delete</button></div></div>)}</div></div>}
function NotFound(){
  return <Layout><section className="section not-found">
    <p className="eyebrow">Error 404</p>
    <h1>We can't find that page</h1>
    <p className="not-found-copy">The page you were looking for may have moved, or the link might be broken. Let's get you back to shopping.</p>
    <div className="not-found-actions">
      <Link className="button" to="/">Back to home</Link>
      <Link className="button secondary" to="/products">Browse the shop</Link>
    </div>
  </section></Layout>;
}
function ScrollToTop(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0)},[pathname]);return null}
function App(){return <AuthProvider><CartProvider><BrowserRouter basename="/shop"><ScrollToTop/><PageSeo supabase={supabase}/><Routes><Route path="/" element={<Home/>}/><Route path="/products" element={<Layout><Products/></Layout>}/><Route path="/products/:slug" element={<ProductDetail/>}/><Route path="/sign-in" element={<SignIn/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/orders" element={<Orders/>}/><Route path="/dashboard" element={<Dashboard/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<NotFound/>}/></Routes></BrowserRouter></CartProvider></AuthProvider>};createRoot(document.getElementById('root')).render(<App/>);
