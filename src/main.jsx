import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './styles.css';
import { brand, heroImage, aisles, stockWall, productImage, sampleProducts } from './media.js';
import { assistantReply } from './assistant.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured = Boolean(url && key && !url.includes('your-project'));
const supabase = configured ? createClient(url, key) : null;
const Auth = createContext(null); const Cart = createContext(null);
const money = n => new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(n || 0));
const dateTime = d => d ? new Date(d).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'}) : 'To be arranged';
const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

function AuthProvider({children}) { const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{ if(!supabase){setLoading(false);return;} supabase.auth.getSession().then(({data})=>setSession(data.session)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,next)=>setSession(next)); return ()=>subscription.unsubscribe(); },[]);
  useEffect(()=>{ if(!session){setProfile(null);setLoading(false);return;} supabase.from('profiles').select('*').eq('id',session.user.id).single().then(({data})=>{setProfile(data);setLoading(false);}); },[session]);
  return <Auth.Provider value={{session,profile,loading,signOut:()=>supabase.auth.signOut()}}>{children}</Auth.Provider> }
function CartProvider({children}) { const [items,setItems]=useState(()=>JSON.parse(localStorage.getItem('coral-cart')||'[]')); useEffect(()=>localStorage.setItem('coral-cart',JSON.stringify(items)),[items]);
 const add=p=>setItems(x=>{const found=x.find(i=>i.id===p.id); return found?x.map(i=>i.id===p.id?{...i,quantity:i.quantity+1}:i):[...x,{...p,quantity:1}]});
 const update=(id,q)=>setItems(x=>q<1?x.filter(i=>i.id!==id):x.map(i=>i.id===id?{...i,quantity:q}:i)); return <Cart.Provider value={{items,add,update,clear:()=>setItems([])}}>{children}</Cart.Provider> }
function useAuth(){return useContext(Auth)} function useCart(){return useContext(Cart)}

function Header(){
  const {session,profile,signOut}=useAuth();
  const {items}=useCart();
  const nav=useNavigate();
  const [menuOpen,setMenuOpen]=useState(false);
  const [q,setQ]=useState('');
  const search=e=>{e.preventDefault();nav('/products?q='+encodeURIComponent(q.trim()))};
  return (
    <header>
      <button className="menu-toggle" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(o=>!o)}>
        <span></span><span></span><span></span>
      </button>
      <Link className="brand" to="/" onClick={()=>setMenuOpen(false)}>
        <img src={brand.logo} alt="Coral Shopping" />
      </Link>
      <form className="search" onSubmit={search} role="search">
        <input type="search" placeholder="Search rice, oil, gifts" value={q} onChange={e=>setQ(e.target.value)} aria-label="Search products" />
      </form>
      <nav className={menuOpen?'open':''}>
        <NavLink to="/products" onClick={()=>setMenuOpen(false)}>Shop</NavLink>
        <a href="/#custom-shop" onClick={()=>setMenuOpen(false)}>Custom shop</a>
        {session&&<NavLink to="/orders" onClick={()=>setMenuOpen(false)}>My orders</NavLink>}
        {profile?.role==='admin'&&<NavLink to="/admin" onClick={()=>setMenuOpen(false)}>Admin</NavLink>}
      </nav>
      <div className="header-actions">
        <Link to="/checkout">Cart <b>{items.reduce((a,i)=>a+i.quantity,0)}</b></Link>
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
          <p className="footer-tag">Quality foodstuffs, gift hampers and household essentials, delivered across Lagos.</p>
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
          <p><a href="tel:09061965441">0906 196 5441</a></p>
          <p><a href="mailto:info@coralshopping.ng">info@coralshopping.ng</a></p>
          <a className="button secondary" href="https://wa.me/2349061965441" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
        </div>
      </div>
      <div className="footer-base">© {new Date().getFullYear()} Coral Shopping. All rights reserved.</div>
    </footer>
  );
}
function ChatLauncher(){
  const {add}=useCart();
  const [open,setOpen]=useState(false);
  const [messages,setMessages]=useState([{role:'bot',text:'Hi, I am the Coral Shopping assistant. Ask me about products, delivery, payments, or tell me what you need and I will point you to it.'}]);
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [products,setProducts]=useState(sampleProducts);
  const bodyRef=useRef(null);
  const suggestions=['What can you help with?','Recommend a gift hamper','How does delivery work?','Add rice to cart'];
  useEffect(()=>{ if(supabase){ supabase.from('products').select('*, category:categories(name,slug)').eq('is_active',true).order('created_at',{ascending:false}).then(({data})=>{ if(data&&data.length) setProducts(data); }); } },[]);
  useEffect(()=>{ if(bodyRef.current) bodyRef.current.scrollTop=bodyRef.current.scrollHeight; },[messages,open,busy]);
  const send=async raw=>{
    const text=(raw||'').trim(); if(!text||busy) return;
    setInput(''); setMessages(m=>[...m,{role:'user',text}]); setBusy(true);
    const reply=await assistantReply(text,{catalog:products});
    if(reply.add) add(reply.add);
    setMessages(m=>[...m,{role:'bot',text:reply.text,products:reply.products}]);
    setBusy(false);
  };
  return (
    <>
      {!open && <button className="chat-fab" aria-label="Open chat" onClick={()=>setOpen(true)}>
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
                  <button onClick={()=>add(p)}>Add</button>
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
function Layout({children}){return <><Header/><main>{children}</main><Footer/><ChatLauncher/></>}
function Notice({children,kind='info'}){return <div className={'notice '+kind}>{children}</div>}

function SignIn(){const nav=useNavigate();const [mode,setMode]=useState('signIn'),[form,setForm]=useState({name:'',email:'',password:''}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);if(!configured)return <Setup/>; const submit=async e=>{e.preventDefault();setBusy(true);setMsg('');let result;if(mode==='signIn')result=await supabase.auth.signInWithPassword({email:form.email,password:form.password});else result=await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{full_name:form.name},emailRedirectTo:window.location.origin}});setBusy(false);if(result.error)return setMsg(result.error.message);if(mode==='signUp')setMsg('Check your email to confirm your account, then sign in.');else nav('/products')}; return <Layout><section className="auth card"><p className="eyebrow">Your account</p><h1>{mode==='signIn'?'Welcome back':'Create your account'}</h1><p>Sign in is required before checkout so you can track your order and delivery.</p>{msg&&<Notice kind={msg.includes('Check')?'success':'error'}>{msg}</Notice>}<form onSubmit={submit}>{mode==='signUp'&&<label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}<label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Password<input type="password" minLength="8" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><button disabled={busy}>{busy?'Please wait…':mode==='signIn'?'Sign in':'Create account'}</button></form><button className="link-button" onClick={()=>{setMode(mode==='signIn'?'signUp':'signIn');setMsg('')}}>{mode==='signIn'?'New here? Create an account':'Already have an account? Sign in'}</button></section></Layout>}
function Setup(){return <Layout><section className="card setup"><h1>Connect Coral Shop to Supabase</h1><p>This secure rebuild requires your free Supabase project credentials.</p><ol><li>Create a free project at Supabase.</li><li>Run <code>supabase/schema.sql</code> in its SQL Editor.</li><li>Copy <code>.env.example</code> to <code>.env</code> and add its Project URL and anon key.</li><li>Restart the app, create an account, then promote your first admin using the README instructions.</li></ol></section></Layout>}
function Products({featured=false}){const [products,setProducts]=useState([]),[category,setCategory]=useState('all'),[loading,setLoading]=useState(true);const [params]=useSearchParams();const q=(params.get('q')||'').toLowerCase().trim();useEffect(()=>{if(!supabase){setProducts(sampleProducts);setLoading(false);return;}supabase.from('products').select('*, category:categories(name,slug)').eq('is_active',true).order('created_at',{ascending:false}).then(({data,error})=>{if(error)console.error(error);setProducts(data||[]);setLoading(false)})},[]);let list=category==='all'?products:products.filter(p=>p.category?.slug===category);if(q)list=list.filter(p=>(p.name+' '+(p.description||'')+' '+(p.category?.name||'')).toLowerCase().includes(q));list=list.slice(0,featured?4:100); return <section className="section"><div className="section-title"><div><p className="eyebrow">{featured?'Best sellers':'Catalog'}</p><h2>{featured?'Popular essentials':'Shop everything'}</h2></div>{featured&&<Link to="/products">Browse all products →</Link>}</div>{!featured&&<div className="chips">{['all','foodstuffs','gifts','household'].map(x=><button className={category===x?'selected':''} onClick={()=>setCategory(x)} key={x}>{x}</button>)}</div>}{loading?<p>Loading products…</p>:<div className="products">{list.map(p=><ProductCard key={p.id} product={p}/>)}</div>}{!loading&&!list.length&&<Notice>{q?'No products match your search. Try another term.':'No products are available yet. Import the product CSV from the Supabase Table Editor.'}</Notice>}</section>}
function ProductCard({product}){const {add}=useCart();return <article className="product card"><div className="product-media"><img src={productImage(product)} alt={product.name||''} loading="lazy"/></div><div><small>{product.category?.name||'Essentials'}</small><h3>{product.name}</h3><p>{product.description}</p><div className="product-bottom"><strong>{money(product.price)}</strong><button onClick={()=>add(product)} disabled={product.stock_quantity<1}>{product.stock_quantity<1?'Out of stock':'Add to cart'}</button></div></div></article>}
function CustomShopForm(){
  const {session,profile}=useAuth();
  const [form,setForm]=useState({name:profile?.full_name||'',phone:profile?.phone||'',items:'',budget:''});
  const [mine,setMine]=useState([]);
  const [msg,setMsg]=useState('');
  const [kind,setKind]=useState('info');
  const [busy,setBusy]=useState(false);
  const loadMine=()=>{if(!supabase||!session){setMine([]);return;} supabase.from('custom_requests').select('*').order('created_at',{ascending:false}).then(({data})=>setMine(data||[]));};
  useEffect(()=>{setForm(f=>({...f,name:profile?.full_name||f.name,phone:profile?.phone||f.phone})); loadMine();},[session,profile]);
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
    setMsg("Request submitted successfully! We'll contact you soon.");
    setForm({name:profile?.full_name||'',phone:profile?.phone||'',items:'',budget:''});
    loadMine();
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
        {session&&mine.length>0&&<div className="orders" style={{marginTop:28,textAlign:'left',maxWidth:560,marginLeft:'auto',marginRight:'auto'}}>{mine.map(r=><article className="order card" key={r.id}><div className="order-head"><div><span className={'status '+r.status}>{r.status}</span><h3>Your request</h3><small>{dateTime(r.created_at)}</small></div>{r.budget&&<b>{r.budget}</b>}</div><p style={{display:'block'}}>{r.items}</p></article>)}</div>}
      </div>
    </section>
  );
}
function AisleCards(){
  return (
    <section className="section aisle-section" id="aisles">
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
function StockWall(){
  return (
    <section className="section stock-wall-section">
      <div className="section-title"><div><p className="eyebrow">From our shelves</p><h2>A look at the catalog</h2></div></div>
      <div className="stock-wall">
        {stockWall.map(s=><figure className="stock-item" key={s.name}><img src={s.image} alt={s.name} loading="lazy"/><figcaption>{s.name}</figcaption></figure>)}
      </div>
    </section>
  );
}
function Home(){return <Layout><section className="hero"><div className="hero-copy"><p className="eyebrow">Lagos grocery and gift store</p><h1>Quality foodstuffs, gifts and household essentials, delivered to your door.</h1><p>Coral Shopping brings the market to you. Stock your kitchen, send a gift hamper, or tell us what you need and we will source it for you.</p><div className="hero-actions"><Link className="button" to="/products">Shop now</Link><a className="button secondary" href="#custom-shop">Shop your way</a></div></div><div className="hero-art"><img src={heroImage} alt="Coral Shopping groceries and household items" loading="lazy"/></div></section><div className="home-below"><AisleCards/><Products featured/><CustomShopForm/><StockWall/></div><section className="callout"><div><p className="eyebrow">Need a hand?</p><h2>Chat with us on WhatsApp for quick orders and delivery questions.</h2></div><a className="button secondary" href="https://wa.me/2349061965441" target="_blank" rel="noreferrer">Chat on WhatsApp</a></section></Layout>}
function RequireAuth({children}){const {session,loading}=useAuth();if(loading)return <Layout><p>Loading…</p></Layout>;return session?children:<Navigate to="/sign-in" replace/>}
function Checkout(){const {items,update,clear}=useCart();const {profile}=useAuth();const nav=useNavigate();const [shipping,setShipping]=useState({name:profile?.full_name||'',phone:profile?.phone||'',address:'',city:'Lagos',state:'Lagos'}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);const subtotal=items.reduce((s,i)=>s+i.price*i.quantity,0),fee=2000;const submit=async e=>{e.preventDefault();if(!items.length)return;setBusy(true);const {data,error}=await supabase.rpc('create_order',{items:items.map(i=>({productId:i.id,quantity:i.quantity})),shipping});setBusy(false);if(error)return setMsg(error.message);clear();nav(`/orders?created=${data}`)};return <RequireAuth><Layout><section className="checkout"><div><p className="eyebrow">Delivery details</p><h1>Where should we deliver?</h1>{msg&&<Notice kind="error">{msg}</Notice>}<form className="card" onSubmit={submit}><div className="two"><label>Full name<input required value={shipping.name} onChange={e=>setShipping({...shipping,name:e.target.value})}/></label><label>Phone<input required value={shipping.phone} onChange={e=>setShipping({...shipping,phone:e.target.value})}/></label></div><label>Delivery address<textarea required value={shipping.address} onChange={e=>setShipping({...shipping,address:e.target.value})}/></label><div className="two"><label>City<input required value={shipping.city} onChange={e=>setShipping({...shipping,city:e.target.value})}/></label><label>State<input required value={shipping.state} onChange={e=>setShipping({...shipping,state:e.target.value})}/></label></div><h3>Payment method</h3><Notice>Bank-transfer payment instructions will be shared after you place this order. Your order stays <b>awaiting payment</b> until you confirm “I’ve made payment.”</Notice><button disabled={busy||!items.length}>{busy?'Creating order…':'Place order'}</button></form></div><CartSummary items={items} update={update} subtotal={subtotal} fee={fee}/></section></Layout></RequireAuth>}
function CartSummary({items,update,subtotal,fee}){return <aside className="summary card"><h2>Your order</h2>{items.map(i=><div className="line cart-line" key={i.id}><img className="cart-thumb" src={productImage(i)} alt={i.name||''} loading="lazy"/><span className="cart-info">{i.name}<small>{money(i.price)} × <input aria-label="quantity" type="number" min="1" value={i.quantity} onChange={e=>update(i.id,Number(e.target.value))}/></small></span><b>{money(i.price*i.quantity)}</b></div>)}<hr/><div className="line"><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="line"><span>Delivery</span><b>{money(fee)}</b></div><div className="line total"><span>Total</span><b>{money(subtotal+fee)}</b></div></aside>}
function Orders(){const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[msg,setMsg]=useState('');const load=()=>supabase.from('orders').select('*, order_items(*)').order('created_at',{ascending:false}).then(({data,error})=>{setOrders(data||[]);setMsg(error?.message||'');setLoading(false)});useEffect(load,[]);const submitted=async id=>{const {error}=await supabase.rpc('submit_payment',{order_id:id});if(error)setMsg(error.message);else {setMsg('Payment submitted. We will confirm it shortly.');load();}};return <RequireAuth><Layout><section className="section"><p className="eyebrow">Your orders</p><h1>My orders</h1>{msg&&<Notice kind={msg.includes('submitted')?'success':'error'}>{msg}</Notice>}{loading?<p>Loading orders…</p>:!orders.length?<Notice>You have no orders yet. <Link to="/products">Start shopping.</Link></Notice>:<div className="orders">{orders.map(o=><article className="order card" key={o.id}><div className="order-head"><div><span className={'status '+o.status}>{o.status.replace('_',' ')}</span><h3>Order #{o.id.slice(0,8)}</h3><small>{dateTime(o.created_at)}</small></div><b>{money(o.total)}</b></div>{o.order_items.map(i=><p key={i.id}>{i.product_name} × {i.quantity} <span>{money(i.line_total)}</span></p>)}<hr/><p><b>Delivery:</b> {o.shipping_address}, {o.shipping_city}, {o.shipping_state}</p>{o.status==='awaiting_payment'&&<><Notice>Make your transfer using the instructions provided by the Coral Shop team, then confirm below. We will verify the payment before dispatch.</Notice><button onClick={()=>submitted(o.id)}>I've made payment</button></>}{o.delivery_scheduled_at&&<Notice kind="success"><b>Delivery scheduled:</b> {dateTime(o.delivery_scheduled_at)}{o.delivery_note&&` · ${o.delivery_note}`}</Notice>}</article>)}</div>}</section></Layout></RequireAuth>}
function Admin(){const {profile}=useAuth();if(profile?.role!=='admin')return <Navigate to="/" replace/>;return <AdminPanel/>}
function AdminPanel(){const [tab,setTab]=useState('orders'),[orders,setOrders]=useState([]),[products,setProducts]=useState([]),[requests,setRequests]=useState([]),[msg,setMsg]=useState('');const load=async()=>{const [{data:o},{data:p},{data:r}]=await Promise.all([supabase.from('orders').select('*, profiles(full_name,email), order_items(*)').order('created_at',{ascending:false}),supabase.from('products').select('*, category:categories(name,slug)').order('created_at',{ascending:false}),supabase.from('custom_requests').select('*').order('created_at',{ascending:false})]);setOrders(o||[]);setProducts(p||[]);setRequests(r||[])};useEffect(()=>{load()},[]);return <Layout><section className="section"><p className="eyebrow">Store control</p><h1>Store control centre</h1><div className="tabs"><button className={tab==='orders'?'selected':''} onClick={()=>setTab('orders')}>Orders</button><button className={tab==='custom'?'selected':''} onClick={()=>setTab('custom')}>Custom requests</button><button className={tab==='products'?'selected':''} onClick={()=>setTab('products')}>Products</button></div>{msg&&<Notice kind="success">{msg}</Notice>}{tab==='orders'?<AdminOrders orders={orders} reload={load} message={setMsg}/>:tab==='custom'?<AdminCustomRequests requests={requests} reload={load} message={setMsg}/>:<AdminProducts products={products} reload={load} message={setMsg}/>}</section></Layout>}
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
function AdminOrders({orders,reload,message}){const [details,setDetails]=useState({});const confirm=async id=>{const d=details[id]||{};const {error}=await supabase.rpc('confirm_payment',{order_id:id,scheduled_at:d.date?new Date(d.date).toISOString():null,note:d.note||null});if(error)return alert(error.message);message('Payment confirmed and delivery information saved.');reload()};const fulfill=async(id,status)=>{const {error}=await supabase.rpc('update_order_fulfillment',{order_id:id,next_status:status,scheduled_at:null,note:null});if(error)return alert(error.message);message('Order status updated.');reload()};return <div className="orders">{orders.map(o=><article className="order card" key={o.id}><div className="order-head"><div><span className={'status '+o.status}>{o.status.replace('_',' ')}</span><h3>#{o.id.slice(0,8)} · {o.profiles?.full_name||'Customer'}</h3><small>{o.profiles?.email} · {o.shipping_phone}</small></div><b>{money(o.total)}</b></div><p>{o.shipping_address}, {o.shipping_city}, {o.shipping_state}</p>{o.order_items.map(i=><p key={i.id}>{i.product_name} × {i.quantity}</p>)}{o.status==='pending'&&<div className="admin-action"><label>Delivery date & time<input type="datetime-local" onChange={e=>setDetails({...details,[o.id]:{...(details[o.id]||{}),date:e.target.value}})}/></label><label>Delivery note<input placeholder="Optional note" onChange={e=>setDetails({...details,[o.id]:{...(details[o.id]||{}),note:e.target.value}})}/></label><button onClick={()=>confirm(o.id)}>Payment received - mark paid</button></div>}{['paid','processing','shipped'].includes(o.status)&&<div className="admin-action"><button onClick={()=>fulfill(o.id,o.status==='paid'?'processing':o.status==='processing'?'shipped':'delivered')}>Mark {o.status==='paid'?'processing':o.status==='processing'?'shipped':'delivered'}</button>{o.delivery_scheduled_at&&<small>Scheduled: {dateTime(o.delivery_scheduled_at)}</small>}</div>}</article>)}</div>}
function AdminProducts({products,reload,message}){const initial={name:'',price:'',category:'foodstuffs',description:'',image_url:'',stock_quantity:'0'};const [form,setForm]=useState(initial);const [editing,setEditing]=useState(null);const save=async e=>{e.preventDefault();const {data:cat}=await supabase.from('categories').select('id').eq('slug',form.category).single();const record={name:form.name,slug:slugify(form.name),price:Number(form.price),description:form.description,image_url:form.image_url,stock_quantity:Number(form.stock_quantity),category_id:cat?.id};const result=editing?await supabase.from('products').update(record).eq('id',editing):await supabase.from('products').insert(record);if(result.error)return alert(result.error.message);setForm(initial);setEditing(null);message('Product saved.');reload()};return <div className="admin-products"><form className="card product-form" onSubmit={save}><h2>{editing?'Edit product':'Add product'}</h2><div className="two"><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Price<input required type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label></div><div className="two"><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['foodstuffs','gifts','household'].map(x=><option key={x}>{x}</option>)}</select></label><label>Stock quantity<input type="number" min="0" value={form.stock_quantity} onChange={e=>setForm({...form,stock_quantity:e.target.value})}/></label></div><label>Image URL<input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})}/></label><label>Description<textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button>{editing?'Save changes':'Add product'}</button>{editing&&<button type="button" className="secondary" onClick={()=>{setEditing(null);setForm(initial)}}>Cancel</button>}</form><div className="product-table card">{products.map(p=><div key={p.id}><img className="admin-thumb" src={productImage(p)} alt={p.name||''} loading="lazy"/><span>{p.name}<small>{p.category?.name} · {p.stock_quantity} in stock</small></span><b>{money(p.price)}</b><button className="secondary" onClick={()=>{setEditing(p.id);setForm({...p,category:p.category?.slug||'foodstuffs'})}}>Edit</button></div>)}</div></div>}
function App(){return <AuthProvider><CartProvider><BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/products" element={<Layout><Products/></Layout>}/><Route path="/sign-in" element={<SignIn/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/orders" element={<Orders/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter></CartProvider></AuthProvider>};createRoot(document.getElementById('root')).render(<App/>);
