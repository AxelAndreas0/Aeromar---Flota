import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import './App.css'
import LOGO from './logo'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TIPOS_CARGA = ['Seca','2-8°C','15-25°C','INTERNO','TALLER','Otro']
const ESTADOS_V = ['Libre','En ruta','En taller','Reservado','Fuera de servicio']
const TIPOS_DOC = ['Habilitación','DINATRAN','Seguro','Revisión técnica','Otro']
const today = () => new Date().toISOString().slice(0,10)
const fmtGs = n => parseInt(n||0).toLocaleString('es-PY')
const fmtUsd = n => parseFloat(n||0).toLocaleString('es-PY',{minimumFractionDigits:2,maximumFractionDigits:2})
const diffDays = d => Math.ceil((new Date(d+'T00:00:00') - new Date()) / 86400000)
const IS_DEMO = email => email === 'demo@aeromar.com.py'

function Toast({msg,type,show}){
  if(!show) return null
  return <div className={`toast ${type==='error'?'t-err':type==='warning'?'t-warn':'t-ok'}`}>{msg}</div>
}
function Empty({text}){return <div className="empty">{text||'Sin datos registrados'}</div>}
function Metric({label,value,sub,color}){
  return <div className={`metric${color?' '+color:''}`}>
    <div className="metric-label">{label}</div>
    <div className={`metric-value${color?' '+color:''}`}>{value}</div>
    {sub&&<div className="metric-sub">{sub}</div>}
  </div>
}
function Badge({text}){
  const m={
    'Libre':'b-green','En ruta':'b-amber','En taller':'b-red',
    'Reservado':'b-purple','Fuera de servicio':'b-gray',
    'Confirmado':'b-blue','A confirmar':'b-amber','Completado':'b-green','Cancelado':'b-gray',
    'Pendiente':'b-amber','Vencido':'b-red','Completado':'b-green',
    'Seca':'b-gray','2-8°C':'b-blue','15-25°C':'b-purple','INTERNO':'b-gray','TALLER':'b-red',
    'En taller':'b-red','Listo':'b-green','Entregado':'b-blue','Programado':'b-purple',
  }
  return <span className={`badge ${m[text]||'b-gray'}`}>{text}</span>
}
function StatusDot({estado}){
  const m={'Libre':'dot-libre','En ruta':'dot-ruta','En taller':'dot-taller','Reservado':'dot-reservado','Fuera de servicio':'dot-fuera'}
  return <span className={`status-dot ${m[estado]||'dot-fuera'}`}/>
}
function Modal({title,onClose,children}){
  return <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="modal">
      <div className="modal-title">{title}</div>
      {children}
    </div>
  </div>
}

function Login({onLogin}){
  const [email,setEmail]=useState('')
  const [pass,setPass]=useState('')
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)
  const handle = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    const {data,error} = await supabase.from('usuarios').select('*').eq('email',email.trim().toLowerCase()).single()
    setLoading(false)
    if(error||!data){setErr('Usuario no encontrado');return}
    if(!data.activo){setErr('Usuario inactivo');return}
    const exp = email.trim().toLowerCase().split('@')[0]
    if(pass!==exp && pass!=='aeromar2026' && pass!=='demo'){setErr('Contraseña incorrecta');return}
    onLogin(data)
  }
  return <div className="login-wrap">
    <div className="login-box">
      <div className="login-logo">
        <img src={LOGO} alt="Aeromar"/>
        <div className="login-title">Fleet Manager</div>
      </div>
      <p className="login-sub">Sistema de gestión de flota y logística</p>
      {err&&<div className="login-err">{err}</div>}
      <form onSubmit={handle}>
        <div style={{marginBottom:14}}>
          <label className="flabel">Email</label>
          <input className="finput" type="email" placeholder="usuario@aeromar.com.py" value={email} onChange={e=>setEmail(e.target.value)} required/>
        </div>
        <div style={{marginBottom:20}}>
          <label className="flabel">Contraseña</label>
          <input className="finput" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required/>
        </div>
        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>{loading?'Ingresando…':'Ingresar'}</button>
      </form>
      <p style={{fontSize:11,color:'var(--gray-400)',textAlign:'center',marginTop:16}}>Contraseña: nombre de usuario antes del @</p>
    </div>
  </div>
}

export default function App(){
  const [user,setUser]=useState(null)
  const [sidebarOpen,setSidebarOpen]=useState(true)
  const [tab,setTab]=useState('dashboard')
  const [vehiculos,setVehiculos]=useState([])
  const [choferes,setChoferes]=useState([])
  const [viajes,setViajes]=useState([])
  const [combustible,setCombustible]=useState([])
  const [taller,setTaller]=useState([])
  const [habilitaciones,setHabilitaciones]=useState([])
  const [mantenimientos,setMantenimientos]=useState([])
  const [tipoCambio,setTipoCambio]=useState(null)
  const [configAlertas,setConfigAlertas]=useState({combustible_amarillo:70,combustible_naranja:85,combustible_rojo:95})
  const [loading,setLoading]=useState(false)
  const [saving,setSaving]=useState(false)
  const [toast,setToast]=useState({show:false,msg:'',type:'success'})
  const [modal,setModal]=useState(null)
  const [fMes,setFMes]=useState(new Date().getMonth())
  const [fAnio,setFAnio]=useState(new Date().getFullYear())
  const [fVehiculo,setFVehiculo]=useState('')
  const [fChofer,setFChofer]=useState('')
  const [fEstado,setFEstado]=useState('')

  const notify = useCallback((msg,type='success')=>{
    setToast({show:true,msg,type})
    setTimeout(()=>setToast(t=>({...t,show:false})),3500)
  },[])

  const isDemo = user ? IS_DEMO(user.email) : false

  const loadAll = useCallback(async()=>{
    if(!user) return
    setLoading(true)
    const demo = IS_DEMO(user.email)
    const demoFilter = (q) => demo ? q.eq('es_demo',true) : q.eq('es_demo',false)

    const [rv,rc,rco,rt,rh,rm,rtc,rca,rch,rveh] = await Promise.all([
      demoFilter(supabase.from('vehiculos').select('*')).order('nombre'),
      demoFilter(supabase.from('viajes').select('*')).order('fecha',{ascending:false}),
      demoFilter(supabase.from('combustible').select('*')).order('fecha',{ascending:false}),
      demoFilter(supabase.from('gastos_taller').select('*')).order('fecha_ingreso',{ascending:false}),
      demoFilter(supabase.from('habilitaciones').select('*')).order('fecha_vencimiento'),
      demoFilter(supabase.from('mantenimientos').select('*')).order('fecha_proximo'),
      supabase.from('tipo_cambio').select('*').order('fecha',{ascending:false}).limit(1),
      supabase.from('config_alertas').select('*').limit(1),
      supabase.from('choferes').select('*').order('nombre'),
      supabase.from('vehiculos').select('*').eq('es_demo',false).order('nombre'),
    ])
    if(!rv.error) setVehiculos(rv.data||[])
    if(!rc.error) setViajes(rc.data||[])
    if(!rco.error) setCombustible(rco.data||[])
    if(!rt.error) setTaller(rt.data||[])
    if(!rh.error) setHabilitaciones(rh.data||[])
    if(!rm.error) setMantenimientos(rm.data||[])
    if(rtc.data?.length>0) setTipoCambio(rtc.data[0])
    if(rca.data?.length>0) setConfigAlertas(rca.data[0])
    if(!rch.error) setChoferes(rch.data||[])
    setLoading(false)
  },[user])

  useEffect(()=>{
    const stored = localStorage.getItem('aeromar_user')
    if(stored) setUser(JSON.parse(stored))
  },[])

  useEffect(()=>{
    if(!user) return
    loadAll()
    const ch = supabase.channel('rt-fleet')
      .on('postgres_changes',{event:'*',schema:'public',table:'vehiculos'},loadAll)
      .on('postgres_changes',{event:'*',schema:'public',table:'viajes'},loadAll)
      .on('postgres_changes',{event:'*',schema:'public',table:'combustible'},loadAll)
      .on('postgres_changes',{event:'*',schema:'public',table:'gastos_taller'},loadAll)
      .on('postgres_changes',{event:'*',schema:'public',table:'habilitaciones'},loadAll)
      .on('postgres_changes',{event:'*',schema:'public',table:'mantenimientos'},loadAll)
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  },[user,loadAll])

  const handleLogin = u => {
    setUser(u)
    localStorage.setItem('aeromar_user',JSON.stringify(u))
  }
  const handleLogout = ()=>{
    setUser(null)
    localStorage.removeItem('aeromar_user')
  }

  const canEdit = user?.rol==='admin'||user?.rol==='operador'

  // ── Alerts ────────────────────────────────────────────────────────────────────
  const alerts = []
  habilitaciones.forEach(h=>{
    const d=diffDays(h.fecha_vencimiento)
    if(d<=0) alerts.push({type:'red',msg:`${h.vehiculo_nombre} — ${h.tipo} VENCIDA`})
    else if(d<=h.dias_alerta) alerts.push({type:d<=7?'red':'amber',msg:`${h.vehiculo_nombre} — ${h.tipo} vence en ${d} días`})
  })
  mantenimientos.filter(m=>m.estado!=='Completado').forEach(m=>{
    const d=diffDays(m.fecha_proximo)
    if(d<=0) alerts.push({type:'red',msg:`${m.vehiculo_nombre} — ${m.tipo} VENCIDO`})
    else if(d<=m.dias_alerta) alerts.push({type:'amber',msg:`${m.vehiculo_nombre} — ${m.tipo} en ${d} días`})
  })
  vehiculos.forEach(v=>{
    if(!v.limite_combustible) return
    const pct=Math.round((v.credito_utilizado/v.limite_combustible)*100)
    if(pct>=configAlertas.combustible_rojo) alerts.push({type:'red',msg:`${v.nombre} — Combustible al ${pct}%`})
    else if(pct>=configAlertas.combustible_naranja) alerts.push({type:'orange',msg:`${v.nombre} — Combustible al ${pct}%`})
  })

  // ── Derived ───────────────────────────────────────────────────────────────────
  const viajesMes = viajes.filter(v=>{
    const d=new Date(v.fecha+'T00:00:00')
    return d.getMonth()===fMes&&d.getFullYear()===fAnio
  })
  const viajesFiltrados = viajes.filter(v=>{
    const d=new Date(v.fecha+'T00:00:00')
    return d.getMonth()===fMes&&d.getFullYear()===fAnio&&
      (!fVehiculo||v.vehiculo_nombre===fVehiculo)&&
      (!fChofer||v.chofer===fChofer)&&
      (!fEstado||v.estado===fEstado)
  })
  const totalGs=viajesMes.reduce((a,v)=>a+(parseInt(v.precio_gs)||0),0)
  const totalUsd=viajesMes.reduce((a,v)=>a+(parseFloat(v.precio_usd)||0),0)
  const kmMes=viajesMes.reduce((a,v)=>a+(parseInt(v.km_recorridos)||0),0)
  const combustMes=combustible.filter(c=>{
    const d=new Date(c.fecha+'T00:00:00')
    return d.getMonth()===fMes&&d.getFullYear()===fAnio
  })
  const totalCombustGs=combustMes.reduce((a,c)=>a+(parseInt(c.precio_gs)||0),0)
  const usoPorVehiculo=vehiculos.map(v=>({
    label:v.nombre,
    val:viajesMes.filter(j=>j.vehiculo_nombre===v.nombre).length
  })).filter(d=>d.val>0).sort((a,b)=>b.val-a.val)
  const maxUso=Math.max(...usoPorVehiculo.map(d=>d.val),1)
  const libres=vehiculos.filter(v=>v.estado==='Libre').length
  const enRuta=vehiculos.filter(v=>v.estado==='En ruta').length
  const enTaller=vehiculos.filter(v=>v.estado==='En taller').length

  const fuelColor=(v,cfg)=>{
    if(!v.limite_combustible) return 'fuel-verde'
    const pct=Math.round((v.credito_utilizado/v.limite_combustible)*100)
    if(pct>=cfg.combustible_rojo) return 'fuel-rojo'
    if(pct>=cfg.combustible_naranja) return 'fuel-naranja'
    if(pct>=cfg.combustible_amarillo) return 'fuel-amarillo'
    return 'fuel-verde'
  }
  const fuelPct=v=>{
    if(!v.limite_combustible) return 0
    return Math.min(100,Math.round((v.credito_utilizado/v.limite_combustible)*100))
  }
  const fleetCardClass=estado=>{
    const m={'Libre':'libre','En ruta':'en-ruta','En taller':'en-taller','Reservado':'reservado','Fuera de servicio':'fuera'}
    return m[estado]||'fuera'
  }

  // ── Save handlers ─────────────────────────────────────────────────────────────
  const saveViaje = async form => {
    const {fecha,vehiculo_id,vehiculo_nombre,chofer,origen,destino,tipo_carga}=form
    if(!fecha||!vehiculo_id||!chofer||!origen||!destino||!tipo_carga){notify('Completá los campos obligatorios *','warning');return}
    setSaving(true)
    const {error}=await supabase.from('viajes').insert([{
      ...form,
      precio_gs:parseInt(form.precio_gs)||0,
      precio_usd:parseFloat(form.precio_usd)||0,
      km_recorridos:parseInt(form.km_recorridos)||0,
      nro_viaje:parseInt(form.nro_viaje)||1,
      es_interno:form.tipo_carga==='INTERNO'||form.tipo_carga==='TALLER',
      es_demo:isDemo,
    }])
    setSaving(false)
    if(error){notify('Error: '+error.message,'error');return}
    const fechaViaje=new Date(form.fecha+'T00:00:00')
    const fechaHoy=new Date(today()+'T00:00:00')
    if((form.estado==='Confirmado'||form.estado==='Completado')&&fechaViaje<=fechaHoy){
      await supabase.from('vehiculos').update({estado:'En ruta'}).eq('id',vehiculo_id)
    }
    notify('Viaje registrado')
    setModal(null)
  }

  const saveCombustible = async form => {
    if(!form.fecha||!form.vehiculo_id){notify('Completá los campos obligatorios *','warning');return}
    setSaving(true)
    const monto=parseInt(form.precio_gs)||0
    const {error}=await supabase.from('combustible').insert([{
      ...form,litros:parseFloat(form.litros)||0,precio_gs:monto,precio_usd:parseFloat(form.precio_usd)||0,es_demo:isDemo
    }])
    if(error){setSaving(false);notify('Error: '+error.message,'error');return}
    const veh=vehiculos.find(v=>v.id===form.vehiculo_id)
    if(veh) await supabase.from('vehiculos').update({credito_utilizado:(veh.credito_utilizado||0)+monto}).eq('id',form.vehiculo_id)
    setSaving(false)
    notify('Carga registrada')
    setModal(null)
  }

  const saveTaller = async form => {
    if(!form.fecha_ingreso||!form.vehiculo_id||!form.motivo){notify('Completá los campos obligatorios *','warning');return}
    setSaving(true)
    const {error}=await supabase.from('gastos_taller').insert([{
      ...form,monto_gs:parseInt(form.monto_gs)||0,monto_usd:parseFloat(form.monto_usd)||0,es_demo:isDemo
    }])
    if(error){setSaving(false);notify('Error: '+error.message,'error');return}
    if(form.estado==='En taller') await supabase.from('vehiculos').update({estado:'En taller'}).eq('id',form.vehiculo_id)
    setSaving(false)
    notify('Registro guardado')
    setModal(null)
  }

  const saveHabilitacion = async form => {
    if(!form.vehiculo_id||!form.tipo||!form.fecha_vencimiento){notify('Completá los campos obligatorios *','warning');return}
    const {error}=await supabase.from('habilitaciones').insert([{...form,dias_alerta:parseInt(form.dias_alerta)||30,es_demo:isDemo}])
    if(error){notify('Error: '+error.message,'error');return}
    notify('Habilitación registrada')
    setModal(null)
  }

  const saveMantenimiento = async form => {
    if(!form.vehiculo_id||!form.tipo||!form.fecha_proximo){notify('Completá los campos obligatorios *','warning');return}
    const {error}=await supabase.from('mantenimientos').insert([{
      ...form,dias_alerta:parseInt(form.dias_alerta)||15,monto_gs:parseInt(form.monto_gs)||0,
      km_ultimo:parseInt(form.km_ultimo)||0,km_proximo:parseInt(form.km_proximo)||0,es_demo:isDemo
    }])
    if(error){notify('Error: '+error.message,'error');return}
    notify('Mantenimiento registrado')
    setModal(null)
  }

  const updateVehiculo = async(id,updates)=>{
    const {error}=await supabase.from('vehiculos').update(updates).eq('id',id)
    if(error) notify('Error','error')
    else notify('Actualizado')
  }

  const deleteRow = async(table,id)=>{
    if(!window.confirm('¿Eliminar este registro?')) return
    await supabase.from(table).delete().eq('id',id)
    notify('Eliminado','error')
  }

  // ── Modal Forms ───────────────────────────────────────────────────────────────
  function ViajeForm(){
    const [f,setF]=useState({fecha:today(),vehiculo_id:'',vehiculo_nombre:'',chofer:'',cliente:'Aeromar Internacional SRL',origen:'',destino:'',tipo_carga:'Seca',km_recorridos:'',precio_gs:'',precio_usd:'',nro_viaje:'1',factura:'',nro_evento:'',estado:'Confirmado',observaciones:''})
    const upd=(k,v)=>setF(p=>({...p,[k]:v}))
    const selVeh=id=>{const v=vehiculos.find(x=>x.id===id);if(v)setF(p=>({...p,vehiculo_id:id,vehiculo_nombre:v.nombre,chofer:v.chofer_asignado||''}))}
    return <>
      <div className="form-grid">
        <div><label className="flabel">Fecha *</label><input type="date" className="finput" value={f.fecha} onChange={e=>upd('fecha',e.target.value)}/></div>
        <div><label className="flabel">Estado</label>
          <select className="finput" value={f.estado} onChange={e=>upd('estado',e.target.value)}>
            <option>Confirmado</option><option>A confirmar</option><option>Completado</option><option>Cancelado</option>
          </select>
        </div>
        <div><label className="flabel">Vehículo *</label>
          <select className="finput" value={f.vehiculo_id} onChange={e=>selVeh(e.target.value)}>
            <option value="">Seleccionar…</option>
            {vehiculos.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </div>
        <div><label className="flabel">Chofer *</label>
          <select className="finput" value={f.chofer} onChange={e=>upd('chofer',e.target.value)}>
            <option value="">Seleccionar…</option>
            {choferes.map(c=><option key={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div><label className="flabel">Origen *</label><input className="finput" placeholder="Ej: Aeromar, AISP, Fapasa" value={f.origen} onChange={e=>upd('origen',e.target.value)}/></div>
        <div><label className="flabel">Destino *</label><input className="finput" placeholder="Ej: CDE, Encarnación, PJC" value={f.destino} onChange={e=>upd('destino',e.target.value)}/></div>
        <div><label className="flabel">Tipo de carga *</label>
          <select className="finput" value={f.tipo_carga} onChange={e=>upd('tipo_carga',e.target.value)}>
            {TIPOS_CARGA.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="flabel">Km recorridos</label><input type="number" className="finput" placeholder="0" value={f.km_recorridos} onChange={e=>upd('km_recorridos',e.target.value)}/></div>
        <div><label className="flabel">Precio Gs.</label><input type="number" className="finput" placeholder="0" value={f.precio_gs} onChange={e=>upd('precio_gs',e.target.value)}/></div>
        <div><label className="flabel">Precio USD</label><input type="number" className="finput" placeholder="0.00" value={f.precio_usd} onChange={e=>upd('precio_usd',e.target.value)}/></div>
        <div><label className="flabel">N° Viaje</label><input type="number" className="finput" placeholder="1" value={f.nro_viaje} onChange={e=>upd('nro_viaje',e.target.value)}/></div>
        <div><label className="flabel">Factura</label><input className="finput" placeholder="N° de factura" value={f.factura} onChange={e=>upd('factura',e.target.value)}/></div>
        <div><label className="flabel">N° Evento / OT</label><input className="finput" placeholder="Ej: 47042" value={f.nro_evento} onChange={e=>upd('nro_evento',e.target.value)}/></div>
        <div className="fg-full"><label className="flabel">Observaciones</label><input className="finput" placeholder="Ej: 13 pallets, temperatura especial…" value={f.observaciones} onChange={e=>upd('observaciones',e.target.value)}/></div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={()=>setModal(null)}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>saveViaje(f)} disabled={saving}>{saving?'Guardando…':'✓ Registrar viaje'}</button>
      </div>
    </>
  }

  function CombustibleForm(){
    const [f,setF]=useState({fecha:today(),vehiculo_id:'',vehiculo_nombre:'',litros:'',precio_gs:'',precio_usd:'',tipo_carga:'Manual',proveedor:'',observaciones:''})
    const upd=(k,v)=>setF(p=>({...p,[k]:v}))
    const selVeh=id=>{const v=vehiculos.find(x=>x.id===id);if(v)setF(p=>({...p,vehiculo_id:id,vehiculo_nombre:v.nombre}))}
    return <>
      <div className="form-grid">
        <div><label className="flabel">Fecha *</label><input type="date" className="finput" value={f.fecha} onChange={e=>upd('fecha',e.target.value)}/></div>
        <div><label className="flabel">Vehículo *</label>
          <select className="finput" value={f.vehiculo_id} onChange={e=>selVeh(e.target.value)}>
            <option value="">Seleccionar…</option>
            {vehiculos.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </div>
        <div><label className="flabel">Litros</label><input type="number" className="finput" placeholder="0.00" value={f.litros} onChange={e=>upd('litros',e.target.value)}/></div>
        <div><label className="flabel">Tipo</label>
          <select className="finput" value={f.tipo_carga} onChange={e=>upd('tipo_carga',e.target.value)}>
            <option>Manual</option><option>Línea de crédito</option>
          </select>
        </div>
        <div><label className="flabel">Monto Gs. *</label><input type="number" className="finput" placeholder="0" value={f.precio_gs} onChange={e=>upd('precio_gs',e.target.value)}/></div>
        <div><label className="flabel">Monto USD</label><input type="number" className="finput" placeholder="0.00" value={f.precio_usd} onChange={e=>upd('precio_usd',e.target.value)}/></div>
        <div><label className="flabel">Proveedor</label><input className="finput" placeholder="Ej: Puma, Shell, Copa" value={f.proveedor} onChange={e=>upd('proveedor',e.target.value)}/></div>
        <div><label className="flabel">Observaciones</label><input className="finput" value={f.observaciones} onChange={e=>upd('observaciones',e.target.value)}/></div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={()=>setModal(null)}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>saveCombustible(f)} disabled={saving}>{saving?'Guardando…':'✓ Registrar carga'}</button>
      </div>
    </>
  }

  function TallerForm(){
    const [f,setF]=useState({fecha_ingreso:today(),fecha_salida:'',vehiculo_id:'',vehiculo_nombre:'',motivo:'',descripcion:'',monto_gs:'',monto_usd:'',observaciones:'',estado:'Programado'})
    const upd=(k,v)=>setF(p=>({...p,[k]:v}))
    const selVeh=id=>{const v=vehiculos.find(x=>x.id===id);if(v)setF(p=>({...p,vehiculo_id:id,vehiculo_nombre:v.nombre}))}
    return <>
      <div className="form-grid">
        <div><label className="flabel">Fecha de ingreso *</label><input type="date" className="finput" value={f.fecha_ingreso} onChange={e=>upd('fecha_ingreso',e.target.value)}/></div>
        <div><label className="flabel">Salida estimada</label><input type="date" className="finput" value={f.fecha_salida} onChange={e=>upd('fecha_salida',e.target.value)}/></div>
        <div><label className="flabel">Vehículo *</label>
          <select className="finput" value={f.vehiculo_id} onChange={e=>selVeh(e.target.value)}>
            <option value="">Seleccionar…</option>
            {vehiculos.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </div>
        <div><label className="flabel">Estado *</label>
          <select className="finput" value={f.estado} onChange={e=>upd('estado',e.target.value)}>
            <option value="Programado">Programado (va a ingresar)</option>
            <option value="En taller">En taller (ya ingresó)</option>
            <option value="Listo">Listo (trabajo terminado)</option>
            <option value="Entregado">Entregado (retirado)</option>
          </select>
        </div>
        <div className="fg-full"><label className="flabel">Motivo *</label><input className="finput" placeholder="Ej: Cambio de frenos, reparación motor, revisión…" value={f.motivo} onChange={e=>upd('motivo',e.target.value)}/></div>
        <div><label className="flabel">Monto Gs.</label><input type="number" className="finput" placeholder="0" value={f.monto_gs} onChange={e=>upd('monto_gs',e.target.value)}/></div>
        <div><label className="flabel">Monto USD</label><input type="number" className="finput" placeholder="0.00" value={f.monto_usd} onChange={e=>upd('monto_usd',e.target.value)}/></div>
        <div className="fg-full"><label className="flabel">Observaciones</label><textarea className="finput" rows={3} value={f.observaciones} onChange={e=>upd('observaciones',e.target.value)} placeholder="Descripción del trabajo, repuestos, detalles…"/></div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={()=>setModal(null)}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>saveTaller(f)} disabled={saving}>{saving?'Guardando…':'✓ Guardar'}</button>
      </div>
    </>
  }

  function HabilitacionForm(){
    const [f,setF]=useState({vehiculo_id:'',vehiculo_nombre:'',tipo:'Habilitación',fecha_vencimiento:'',dias_alerta:'30',observaciones:''})
    const upd=(k,v)=>setF(p=>({...p,[k]:v}))
    const selVeh=id=>{const v=vehiculos.find(x=>x.id===id);if(v)setF(p=>({...p,vehiculo_id:id,vehiculo_nombre:v.nombre}))}
    return <>
      <div className="form-grid">
        <div><label className="flabel">Vehículo *</label>
          <select className="finput" value={f.vehiculo_id} onChange={e=>selVeh(e.target.value)}>
            <option value="">Seleccionar…</option>
            {vehiculos.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </div>
        <div><label className="flabel">Tipo de documento *</label>
          <select className="finput" value={f.tipo} onChange={e=>upd('tipo',e.target.value)}>
            {TIPOS_DOC.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="flabel">Fecha de vencimiento *</label><input type="date" className="finput" value={f.fecha_vencimiento} onChange={e=>upd('fecha_vencimiento',e.target.value)}/></div>
        <div><label className="flabel">Alertar con X días de anticipación</label><input type="number" className="finput" value={f.dias_alerta} onChange={e=>upd('dias_alerta',e.target.value)}/></div>
        <div className="fg-full"><label className="flabel">Observaciones</label><input className="finput" value={f.observaciones} onChange={e=>upd('observaciones',e.target.value)}/></div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={()=>setModal(null)}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>saveHabilitacion(f)}>✓ Guardar</button>
      </div>
    </>
  }

  function MantenimientoForm(){
    const [f,setF]=useState({vehiculo_id:'',vehiculo_nombre:'',tipo:'',fecha_ultimo:'',km_ultimo:'',fecha_proximo:'',km_proximo:'',dias_alerta:'15',monto_gs:'',observaciones:''})
    const upd=(k,v)=>setF(p=>({...p,[k]:v}))
    const selVeh=id=>{const v=vehiculos.find(x=>x.id===id);if(v)setF(p=>({...p,vehiculo_id:id,vehiculo_nombre:v.nombre}))}
    return <>
      <div className="form-grid">
        <div><label className="flabel">Vehículo *</label>
          <select className="finput" value={f.vehiculo_id} onChange={e=>selVeh(e.target.value)}>
            <option value="">Seleccionar…</option>
            {vehiculos.map(v=><option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </div>
        <div><label className="flabel">Tipo de mantenimiento *</label><input className="finput" placeholder="Ej: Cambio de aceite, frenos, service…" value={f.tipo} onChange={e=>upd('tipo',e.target.value)}/></div>
        <div><label className="flabel">Último mantenimiento</label><input type="date" className="finput" value={f.fecha_ultimo} onChange={e=>upd('fecha_ultimo',e.target.value)}/></div>
        <div><label className="flabel">Km en último</label><input type="number" className="finput" placeholder="0" value={f.km_ultimo} onChange={e=>upd('km_ultimo',e.target.value)}/></div>
        <div><label className="flabel">Próximo mantenimiento *</label><input type="date" className="finput" value={f.fecha_proximo} onChange={e=>upd('fecha_proximo',e.target.value)}/></div>
        <div><label className="flabel">Km próximo</label><input type="number" className="finput" placeholder="0" value={f.km_proximo} onChange={e=>upd('km_proximo',e.target.value)}/></div>
        <div><label className="flabel">Alertar con X días de anticipación</label><input type="number" className="finput" value={f.dias_alerta} onChange={e=>upd('dias_alerta',e.target.value)}/></div>
        <div><label className="flabel">Costo estimado Gs.</label><input type="number" className="finput" placeholder="0" value={f.monto_gs} onChange={e=>upd('monto_gs',e.target.value)}/></div>
        <div className="fg-full"><label className="flabel">Observaciones</label><input className="finput" value={f.observaciones} onChange={e=>upd('observaciones',e.target.value)}/></div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={()=>setModal(null)}>Cancelar</button>
        <button className="btn btn-primary" onClick={()=>saveMantenimiento(f)}>✓ Guardar</button>
      </div>
    </>
  }

  function TipoCambioForm({onSave}){
    const [rate,setRate]=useState('')
    return <div>
      <label className="flabel">Cotización USD en Guaraníes (Gs.)</label>
      <div style={{display:'flex',gap:8,marginTop:6}}>
        <input type="number" className="finput" placeholder="Ej: 7850000" value={rate} onChange={e=>setRate(e.target.value)} style={{flex:1}}/>
        <button className="btn btn-primary" onClick={()=>{if(!rate)return;onSave(parseFloat(rate));setRate('')}}>Guardar</button>
      </div>
      <p style={{fontSize:11,color:'var(--gray-400)',marginTop:8}}>Consultá la cotización en <strong>bcp.gov.py</strong></p>
    </div>
  }

  function TipoCambioHistorial(){
    const [rows,setRows]=useState([])
    useEffect(()=>{
      supabase.from('tipo_cambio').select('*').order('fecha',{ascending:false}).limit(30).then(({data})=>setRows(data||[]))
    },[])
    if(!rows.length) return <tr><td colSpan={3}><Empty/></td></tr>
    return rows.map(r=><tr key={r.id}>
      <td>{r.fecha}</td>
      <td className="td-b">₲ {parseInt(r.usd_gs).toLocaleString('es-PY')}</td>
      <td className="td-m">{r.fuente}</td>
    </tr>)
  }

  if(!user) return <Login onLogin={handleLogin}/>

  const NAV=[
    {id:'dashboard',label:'Dashboard',icon:'▦'},
    {id:'flota',label:'Flota',icon:'🚛'},
    {id:'viajes',label:'Viajes',icon:'🗺'},
    {id:'combustible',label:'Combustible',icon:'⛽'},
    {id:'taller',label:'Taller',icon:'🔧'},
    {id:'habilitaciones',label:'Habilitaciones',icon:'📋'},
    {id:'mantenimientos',label:'Mantenimientos',icon:'🔩'},
    {id:'choferes',label:'Choferes',icon:'👤'},
    {id:'reportes',label:'Reportes',icon:'📊'},
    {id:'tipocambio',label:'Tipo de cambio',icon:'💱'},
  ]

  const redAlerts=alerts.filter(a=>a.type==='red')
  const amberAlerts=alerts.filter(a=>a.type==='amber'||a.type==='orange')

  return <div className="app">
    <Toast {...toast}/>
    {modal&&<Modal title={modal.title} onClose={()=>setModal(null)}>{modal.content}</Modal>}

    <header className="hdr">
      <div className="hdr-left">
        <button className="hdr-toggle" onClick={()=>setSidebarOpen(o=>!o)}>{sidebarOpen?'☰':'☰'}</button>
        <div className="hdr-brand">
          <img src={LOGO} alt="Aeromar" className="hdr-logo"/>
          <div>
            <div className="hdr-name">Fleet Manager</div>
            <div className="hdr-sub">Gestión de flota · Logística</div>
          </div>
        </div>
      </div>
      <div className="hdr-right">
        {tipoCambio&&<div className="hdr-tc">USD ₲{fmtGs(tipoCambio.usd_gs)} · {tipoCambio.fecha}</div>}
        {alerts.length>0&&<div className="hdr-alerts">⚠ {alerts.length} alerta{alerts.length>1?'s':''}</div>}
        {isDemo&&<span className="demo-badge">DEMO</span>}
        <div className="hdr-user">
          <span>{user.nombre}</span>
          <span className="hdr-role">{user.rol}</span>
        </div>
        <button className="hdr-logout" onClick={handleLogout}>Salir</button>
      </div>
    </header>

    {redAlerts.length>0&&<div className="alert-strip">
      {redAlerts.slice(0,3).map((a,i)=><div key={i} className="alert-strip-item">⚠ {a.msg}</div>)}
      {redAlerts.length>3&&<div className="alert-strip-item">+{redAlerts.length-3} más</div>}
    </div>}

    <div className="app-body">
      <aside className={`sidebar${sidebarOpen?'':' collapsed'}`}>
        <div className="sidebar-section">Navegación</div>
        {NAV.map(n=>{
          const alertCount=n.id==='habilitaciones'?habilitaciones.filter(h=>diffDays(h.fecha_vencimiento)<=h.dias_alerta).length:
                           n.id==='mantenimientos'?mantenimientos.filter(m=>m.estado!=='Completado'&&diffDays(m.fecha_proximo)<=m.dias_alerta).length:0
          return <button key={n.id} className={`nav-item${tab===n.id?' active':''}`} onClick={()=>setTab(n.id)}>
            <span className="nav-item-icon">{n.icon}</span>
            <span className="nav-item-label">{n.label}</span>
            {alertCount>0&&<span className="nav-alert">{alertCount}</span>}
          </button>
        })}
      </aside>

      <div className="content">
        {loading&&<Empty text="Cargando datos…"/>}

        {/* ── DASHBOARD ──────────────────────────────────────────── */}
        {!loading&&tab==='dashboard'&&<>
          <div className="ph">
            <div>
              <div className="ph-title">Dashboard {isDemo&&<span style={{fontSize:14,color:'var(--amber)',fontWeight:400}}>— Modo Demo</span>}</div>
              <div className="ph-sub">Resumen operativo · {MESES[fMes]} {fAnio}</div>
            </div>
            <div className="ph-actions">
              <select className="finput" style={{width:'auto'}} value={fMes} onChange={e=>setFMes(parseInt(e.target.value))}>
                {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
              <select className="finput" style={{width:'auto'}} value={fAnio} onChange={e=>setFAnio(parseInt(e.target.value))}>
                {[2025,2026,2027].map(y=><option key={y}>{y}</option>)}
              </select>
              <button className="btn" onClick={loadAll}>↻</button>
            </div>
          </div>

          {alerts.length>0&&<div className="alert-list">
            {alerts.map((a,i)=><div key={i} className={`alert-item ${a.type}`}><span className="alert-icon">⚠</span>{a.msg}</div>)}
          </div>}

          <div className="metrics">
            <Metric label="Viajes del mes" value={viajesMes.filter(v=>!v.es_interno).length} color="blue"/>
            <Metric label="Facturado Gs." value={`₲ ${fmtGs(totalGs)}`} color="blue" sub="este mes"/>
            <Metric label="Facturado USD" value={`$ ${fmtUsd(totalUsd)}`} color="green" sub="este mes"/>
            <Metric label="Km recorridos" value={`${fmtGs(kmMes)} km`} sub="este mes"/>
            <Metric label="Libres" value={libres} color="green" sub={`${enRuta} en ruta · ${enTaller} en taller`}/>
            <Metric label="Combustible mes" value={`₲ ${fmtGs(totalCombustGs)}`} color="amber"/>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--gray-600)',marginBottom:10,textTransform:'uppercase',letterSpacing:'.04em'}}>Estado de flota</div>
            <div className="fleet-status-grid">
              {vehiculos.map(v=>{
                const pct=fuelPct(v)
                const fc=fuelColor(v,configAlertas)
                return <div key={v.id} className={`fleet-status-card ${fleetCardClass(v.estado)}`}>
                  <div className="fsc-name" title={v.nombre}>{v.nombre}</div>
                  <div className="fsc-sub" title={v.chofer_asignado||'Sin chofer'}>{v.chofer_asignado||'Sin chofer'}</div>
                  <div className="fsc-status">
                    <StatusDot estado={v.estado}/>
                    <span style={{fontSize:11,color:'var(--gray-600)'}}>{v.estado}</span>
                  </div>
                  {v.limite_combustible>0&&<div className="fuel-mini">
                    <div className={`fuel-mini-fill ${fc}`} style={{width:`${pct}%`}}/>
                  </div>}
                </div>
              })}
            </div>
          </div>

          <div className="g2">
            <div className="card">
              <div className="card-header"><div className="card-title">Viajes por vehículo — {MESES[fMes]}</div></div>
              <div className="card-body">
                {usoPorVehiculo.length===0?<Empty text="Sin viajes este mes"/>:usoPorVehiculo.map((d,i)=><div key={i} className="bar-row">
                  <span className="bar-lbl" title={d.label}>{d.label}</span>
                  <div className="bar-track"><div className="bar-fill-blue" style={{width:`${Math.round(d.val/maxUso*100)}%`}}/></div>
                  <span className="bar-num">{d.val}</span>
                </div>)}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Últimos movimientos</div></div>
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>Fecha</th><th>Vehículo</th><th>Origen → Destino</th><th>Gs.</th><th>Estado</th></tr></thead>
                  <tbody>
                    {viajes.slice(0,6).map(v=><tr key={v.id}>
                      <td className="td-m">{v.fecha}</td>
                      <td className="td-b">{v.vehiculo_nombre}</td>
                      <td className="td-m">{v.origen} → {v.destino}</td>
                      <td>{v.es_interno?<Badge text="INTERNO"/>:v.precio_gs?`₲ ${fmtGs(v.precio_gs)}`:'-'}</td>
                      <td><Badge text={v.estado}/></td>
                    </tr>)}
                    {viajes.length===0&&<tr><td colSpan={5}><Empty/></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>}

        {/* ── FLOTA ──────────────────────────────────────────────── */}
        {!loading&&tab==='flota'&&<>
          <div className="ph">
            <div><div className="ph-title">Flota</div><div className="ph-sub">{vehiculos.length} vehículos · {libres} libres · {enRuta} en ruta · {enTaller} en taller</div></div>
            <button className="btn" onClick={loadAll}>↻ Actualizar</button>
          </div>
          <div className="fleet-grid">
            {vehiculos.map(v=>{
              const pct=fuelPct(v)
              const fc=fuelColor(v,configAlertas)
              const viajesHoy=viajes.filter(j=>j.vehiculo_nombre===v.nombre&&j.fecha===today()).length
              return <div key={v.id} className="vcard">
                <div className="vcard-header">
                  <div>
                    <div className="vcard-name">{v.nombre}</div>
                    <div className="vcard-type">{v.marca} {v.modelo} · {v.chapa}</div>
                  </div>
                  <Badge text={v.estado}/>
                </div>
                <div className="vcard-row"><span className="vcard-row-label">Chofer</span><span className="vcard-row-val">{v.chofer_asignado||'—'}</span></div>
                <div className="vcard-row"><span className="vcard-row-label">Odómetro</span><span className="vcard-row-val">{fmtGs(v.odometro_actual)} km</span></div>
                <div className="vcard-row"><span className="vcard-row-label">Viajes hoy</span><span className="vcard-row-val">{viajesHoy}</span></div>
                {v.limite_combustible>0&&<div className="vcard-fuel">
                  <div className="fuel-label">
                    <span>Combustible {MESES[new Date().getMonth()]}</span>
                    <span className={pct>=configAlertas.combustible_rojo?'td-r':pct>=configAlertas.combustible_naranja?'td-a':''}>{pct}%</span>
                  </div>
                  <div className="fuel-bar"><div className={`fuel-fill ${fc}`} style={{width:`${pct}%`}}/></div>
                  <div style={{fontSize:11,color:'var(--gray-400)',marginTop:3}}>₲ {fmtGs(v.credito_utilizado)} / {fmtGs(v.limite_combustible)}</div>
                </div>}
                {canEdit&&<div className="vcard-actions">
                  {ESTADOS_V.map(e=><button key={e} className={`btn btn-xs${v.estado===e?' btn-primary':''}`}
                    onClick={()=>updateVehiculo(v.id,{estado:e})}>{e}</button>)}
                </div>}
              </div>
            })}
          </div>
        </>}

        {/* ── VIAJES ─────────────────────────────────────────────── */}
        {!loading&&tab==='viajes'&&<>
          <div className="ph">
            <div><div className="ph-title">Viajes</div><div className="ph-sub">{viajesFiltrados.length} registros — {MESES[fMes]} {fAnio}</div></div>
            <div className="ph-actions">
              <select className="finput" style={{width:'auto'}} value={fMes} onChange={e=>setFMes(parseInt(e.target.value))}>{MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
              <select className="finput" style={{width:'auto'}} value={fAnio} onChange={e=>setFAnio(parseInt(e.target.value))}>{[2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select>
              <select className="finput" style={{width:'auto'}} value={fVehiculo} onChange={e=>setFVehiculo(e.target.value)}>
                <option value="">Todos los vehículos</option>
                {vehiculos.map(v=><option key={v.id}>{v.nombre}</option>)}
              </select>
              <select className="finput" style={{width:'auto'}} value={fChofer} onChange={e=>setFChofer(e.target.value)}>
                <option value="">Todos los choferes</option>
                {choferes.map(c=><option key={c.id}>{c.nombre}</option>)}
              </select>
              <select className="finput" style={{width:'auto'}} value={fEstado} onChange={e=>setFEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option>Confirmado</option><option>A confirmar</option><option>Completado</option><option>Cancelado</option>
              </select>
              {canEdit&&<button className="btn btn-primary" onClick={()=>setModal({title:'Registrar viaje',content:<ViajeForm/>})}>+ Nuevo viaje</button>}
            </div>
          </div>
          <div className="metrics">
            <Metric label="Viajes" value={viajesFiltrados.filter(v=>!v.es_interno).length}/>
            <Metric label="Total Gs." value={`₲ ${fmtGs(viajesFiltrados.reduce((a,v)=>a+(parseInt(v.precio_gs)||0),0))}`} color="blue"/>
            <Metric label="Total USD" value={`$ ${fmtUsd(viajesFiltrados.reduce((a,v)=>a+(parseFloat(v.precio_usd)||0),0))}`} color="green"/>
            <Metric label="Km totales" value={`${fmtGs(viajesFiltrados.reduce((a,v)=>a+(parseInt(v.km_recorridos)||0),0))} km`}/>
          </div>
          <div className="card card-np">
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>Vehículo</th><th>Chofer</th><th>Origen → Destino</th><th>Tipo</th><th>Km</th><th>N°</th><th>Gs.</th><th>USD</th><th>Factura</th><th>Estado</th><th>Obs.</th>{canEdit&&<th></th>}</tr></thead>
                <tbody>
                  {viajesFiltrados.length===0&&<tr><td colSpan={13}><Empty/></td></tr>}
                  {viajesFiltrados.map(v=><tr key={v.id}>
                    <td>{v.fecha}</td>
                    <td className="td-b">{v.vehiculo_nombre}</td>
                    <td>{v.chofer}</td>
                    <td className="td-m">{v.origen} → {v.destino}</td>
                    <td><Badge text={v.tipo_carga}/></td>
                    <td className="td-m">{v.km_recorridos||'-'}</td>
                    <td className="td-m">{v.nro_viaje}</td>
                    <td>{v.es_interno?<Badge text="INTERNO"/>:v.precio_gs?`₲ ${fmtGs(v.precio_gs)}`:'-'}</td>
                    <td>{v.precio_usd?`$ ${fmtUsd(v.precio_usd)}`:'-'}</td>
                    <td className="td-m">{v.factura||'-'}</td>
                    <td><Badge text={v.estado}/></td>
                    <td className="td-m" style={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={v.observaciones}>{v.observaciones||'-'}</td>
                    {canEdit&&<td><button className="btn btn-xs btn-danger" onClick={()=>deleteRow('viajes',v.id)}>✕</button></td>}
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {/* ── COMBUSTIBLE ────────────────────────────────────────── */}
        {!loading&&tab==='combustible'&&<>
          <div className="ph">
            <div><div className="ph-title">Combustible</div><div className="ph-sub">Control de cargas y líneas de crédito</div></div>
            <div className="ph-actions">
              <select className="finput" style={{width:'auto'}} value={fMes} onChange={e=>setFMes(parseInt(e.target.value))}>{MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
              {canEdit&&<button className="btn btn-primary" onClick={()=>setModal({title:'Registrar carga de combustible',content:<CombustibleForm/>})}>+ Nueva carga</button>}
            </div>
          </div>
          <div className="metrics">
            <Metric label="Cargas este mes" value={combustMes.length}/>
            <Metric label="Litros totales" value={combustMes.reduce((a,c)=>a+(parseFloat(c.litros)||0),0).toFixed(1)} sub="litros"/>
            <Metric label="Monto Gs." value={`₲ ${fmtGs(totalCombustGs)}`} color="blue"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10,marginBottom:16}}>
            {vehiculos.filter(v=>v.limite_combustible>0).map(v=>{
              const pct=fuelPct(v)
              const fc=fuelColor(v,configAlertas)
              return <div key={v.id} className="card" style={{padding:14,marginBottom:0}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{v.nombre}</div>
                <div style={{fontSize:11,color:'var(--gray-500)',marginBottom:8}}>Límite: ₲ {fmtGs(v.limite_combustible)}</div>
                <div className="fuel-bar" style={{height:8,marginBottom:4}}><div className={`fuel-fill ${fc}`} style={{width:`${pct}%`}}/></div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
                  <span style={{color:'var(--gray-500)'}}>₲ {fmtGs(v.credito_utilizado)}</span>
                  <span className={pct>=configAlertas.combustible_rojo?'td-r':pct>=configAlertas.combustible_naranja?'td-a':''}>{pct}%</span>
                </div>
              </div>
            })}
          </div>
          <div className="card card-np">
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>Vehículo</th><th>Litros</th><th>Tipo</th><th>Monto Gs.</th><th>USD</th><th>Proveedor</th><th>Obs.</th>{canEdit&&<th></th>}</tr></thead>
                <tbody>
                  {combustMes.length===0&&<tr><td colSpan={9}><Empty/></td></tr>}
                  {combustMes.map(c=><tr key={c.id}>
                    <td>{c.fecha}</td><td className="td-b">{c.vehiculo_nombre}</td>
                    <td>{c.litros||'-'}</td><td>{c.tipo_carga}</td>
                    <td>₲ {fmtGs(c.precio_gs)}</td>
                    <td>{c.precio_usd?`$ ${fmtUsd(c.precio_usd)}`:'-'}</td>
                    <td className="td-m">{c.proveedor||'-'}</td>
                    <td className="td-m">{c.observaciones||'-'}</td>
                    {canEdit&&<td><button className="btn btn-xs btn-danger" onClick={()=>deleteRow('combustible',c.id)}>✕</button></td>}
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {/* ── TALLER ─────────────────────────────────────────────── */}
        {!loading&&tab==='taller'&&<>
          <div className="ph">
            <div><div className="ph-title">Taller</div><div className="ph-sub">Reparaciones correctivas — fallas e imprevistos. Para servicios preventivos usá Mantenimientos.</div></div>
            {canEdit&&<button className="btn btn-primary" onClick={()=>setModal({title:'Registrar ingreso a taller',content:<TallerForm/>})}>+ Nuevo ingreso</button>}
          </div>
          <div className="metrics">
            <Metric label="En taller ahora" value={taller.filter(t=>t.estado==='En taller').length} color="red"/>
            <Metric label="Programados" value={taller.filter(t=>t.estado==='Programado').length} color="amber"/>
            <Metric label="Total gastado Gs." value={`₲ ${fmtGs(taller.reduce((a,t)=>a+(parseInt(t.monto_gs)||0),0))}`} color="blue"/>
          </div>
          <div className="card card-np">
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Ingreso</th><th>Salida est.</th><th>Vehículo</th><th>Motivo</th><th>Monto Gs.</th><th>USD</th><th>Estado</th><th>Observaciones</th>{canEdit&&<th></th>}</tr></thead>
                <tbody>
                  {taller.length===0&&<tr><td colSpan={9}><Empty/></td></tr>}
                  {taller.map(t=><tr key={t.id}>
                    <td>{t.fecha_ingreso}</td>
                    <td className="td-m">{t.fecha_salida||'—'}</td>
                    <td className="td-b">{t.vehiculo_nombre}</td>
                    <td>{t.motivo}</td>
                    <td>₲ {fmtGs(t.monto_gs)}</td>
                    <td>{t.monto_usd?`$ ${fmtUsd(t.monto_usd)}`:'-'}</td>
                    <td><Badge text={t.estado}/></td>
                    <td className="td-m" style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.observaciones}>{t.observaciones||'-'}</td>
                    {canEdit&&<td><div className="ra">
                      <button className="btn btn-xs btn-success" onClick={()=>supabase.from('gastos_taller').update({estado:'Entregado'}).eq('id',t.id).then(loadAll)}>✓</button>
                      <button className="btn btn-xs btn-danger" onClick={()=>deleteRow('gastos_taller',t.id)}>✕</button>
                    </div></td>}
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {/* ── HABILITACIONES ─────────────────────────────────────── */}
        {!loading&&tab==='habilitaciones'&&<>
          <div className="ph">
            <div><div className="ph-title">Habilitaciones y documentos</div><div className="ph-sub">Vencimientos por vehículo con alertas automáticas</div></div>
            {canEdit&&<button className="btn btn-primary" onClick={()=>setModal({title:'Registrar habilitación / documento',content:<HabilitacionForm/>})}>+ Agregar</button>}
          </div>
          <div className="card card-np">
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Vehículo</th><th>Tipo</th><th>Vencimiento</th><th>Días restantes</th><th>Alerta (días)</th><th>Estado</th>{canEdit&&<th></th>}</tr></thead>
                <tbody>
                  {habilitaciones.length===0&&<tr><td colSpan={7}><Empty text="No hay documentos cargados. Agregá las habilitaciones de cada vehículo."/></td></tr>}
                  {habilitaciones.map(h=>{
                    const d=diffDays(h.fecha_vencimiento)
                    return <tr key={h.id}>
                      <td className="td-b">{h.vehiculo_nombre}</td>
                      <td>{h.tipo}</td>
                      <td>{h.fecha_vencimiento}</td>
                      <td className={d<=0?'td-r':d<=7?'td-r':d<=h.dias_alerta?'td-a':'td-g'}>{d<=0?`Vencida hace ${Math.abs(d)} días`:`${d} días`}</td>
                      <td className="td-m">{h.dias_alerta} días</td>
                      <td><Badge text={d<=0?'Vencido':d<=h.dias_alerta?'Pendiente':'Confirmado'}/></td>
                      {canEdit&&<td><button className="btn btn-xs btn-danger" onClick={()=>deleteRow('habilitaciones',h.id)}>✕</button></td>}
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {/* ── MANTENIMIENTOS ─────────────────────────────────────── */}
        {!loading&&tab==='mantenimientos'&&<>
          <div className="ph">
            <div><div className="ph-title">Mantenimientos</div><div className="ph-sub">Servicios preventivos planificados — cambios de aceite, revisiones periódicas, frenos. Para fallas usá Taller.</div></div>
            {canEdit&&<button className="btn btn-primary" onClick={()=>setModal({title:'Registrar mantenimiento',content:<MantenimientoForm/>})}>+ Agregar</button>}
          </div>
          <div className="card card-np">
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Vehículo</th><th>Tipo</th><th>Último</th><th>Próximo</th><th>Días restantes</th><th>Km próximo</th><th>Costo est.</th><th>Estado</th>{canEdit&&<th></th>}</tr></thead>
                <tbody>
                  {mantenimientos.length===0&&<tr><td colSpan={9}><Empty text="No hay mantenimientos registrados."/></td></tr>}
                  {mantenimientos.map(m=>{
                    const d=diffDays(m.fecha_proximo)
                    return <tr key={m.id}>
                      <td className="td-b">{m.vehiculo_nombre}</td>
                      <td>{m.tipo}</td>
                      <td className="td-m">{m.fecha_ultimo||'—'}</td>
                      <td>{m.fecha_proximo}</td>
                      <td className={d<=0?'td-r':d<=7?'td-r':d<=m.dias_alerta?'td-a':'td-g'}>{d<=0?`Vencido hace ${Math.abs(d)} días`:`${d} días`}</td>
                      <td className="td-m">{m.km_proximo?`${fmtGs(m.km_proximo)} km`:'—'}</td>
                      <td>{m.monto_gs?`₲ ${fmtGs(m.monto_gs)}`:'-'}</td>
                      <td><Badge text={m.estado}/></td>
                      {canEdit&&<td><div className="ra">
                        <button className="btn btn-xs btn-success" onClick={()=>supabase.from('mantenimientos').update({estado:'Completado'}).eq('id',m.id).then(loadAll)}>✓</button>
                        <button className="btn btn-xs btn-danger" onClick={()=>deleteRow('mantenimientos',m.id)}>✕</button>
                      </div></td>}
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {/* ── CHOFERES ───────────────────────────────────────────── */}
        {!loading&&tab==='choferes'&&<>
          <div className="ph">
            <div><div className="ph-title">Choferes</div><div className="ph-sub">{choferes.length} choferes registrados</div></div>
          </div>
          <div className="card card-np">
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Nombre</th><th>CI</th><th>Teléfono</th><th>Viajes {MESES[fMes]}</th><th>Km {MESES[fMes]}</th><th>Facturado Gs.</th></tr></thead>
                <tbody>
                  {choferes.length===0&&<tr><td colSpan={6}><Empty/></td></tr>}
                  {choferes.map(c=>{
                    const vs=viajesMes.filter(v=>v.chofer===c.nombre)
                    return <tr key={c.id}>
                      <td className="td-b">{c.nombre}</td>
                      <td className="td-m">{c.ci||'—'}</td>
                      <td className="td-m">{c.telefono||'—'}</td>
                      <td>{vs.length}</td>
                      <td>{fmtGs(vs.reduce((a,v)=>a+(parseInt(v.km_recorridos)||0),0))} km</td>
                      <td>₲ {fmtGs(vs.reduce((a,v)=>a+(parseInt(v.precio_gs)||0),0))}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {/* ── REPORTES ───────────────────────────────────────────── */}
        {!loading&&tab==='reportes'&&<>
          <div className="ph">
            <div><div className="ph-title">Reportes</div><div className="ph-sub">Resumen ejecutivo por período</div></div>
            <div className="ph-actions">
              <select className="finput" style={{width:'auto'}} value={fMes} onChange={e=>setFMes(parseInt(e.target.value))}>{MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
              <select className="finput" style={{width:'auto'}} value={fAnio} onChange={e=>setFAnio(parseInt(e.target.value))}>{[2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select>
            </div>
          </div>
          <div className="metrics">
            <Metric label="Viajes" value={viajesMes.filter(v=>!v.es_interno).length}/>
            <Metric label="Total Gs." value={`₲ ${fmtGs(totalGs)}`} color="blue"/>
            <Metric label="Total USD" value={`$ ${fmtUsd(totalUsd)}`} color="green"/>
            <Metric label="Km recorridos" value={`${fmtGs(kmMes)} km`}/>
            <Metric label="Combustible" value={`₲ ${fmtGs(totalCombustGs)}`} color="amber"/>
            <Metric label="Gastos taller" value={`₲ ${fmtGs(taller.filter(t=>{const d=new Date(t.fecha_ingreso+'T00:00:00');return d.getMonth()===fMes&&d.getFullYear()===fAnio}).reduce((a,t)=>a+(parseInt(t.monto_gs)||0),0))}`}/>
          </div>
          <div className="g2">
            <div className="card">
              <div className="card-header"><div className="card-title">Por vehículo — {MESES[fMes]} {fAnio}</div></div>
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>Vehículo</th><th>Viajes</th><th>Km</th><th>Total Gs.</th><th>Total USD</th></tr></thead>
                  <tbody>
                    {vehiculos.map(v=>{
                      const vs=viajesMes.filter(j=>j.vehiculo_nombre===v.nombre)
                      if(!vs.length) return null
                      return <tr key={v.id}>
                        <td className="td-b">{v.nombre}</td>
                        <td>{vs.length}</td>
                        <td>{fmtGs(vs.reduce((a,j)=>a+(parseInt(j.km_recorridos)||0),0))} km</td>
                        <td>₲ {fmtGs(vs.reduce((a,j)=>a+(parseInt(j.precio_gs)||0),0))}</td>
                        <td>$ {fmtUsd(vs.reduce((a,j)=>a+(parseFloat(j.precio_usd)||0),0))}</td>
                      </tr>
                    })}
                    {viajesMes.length===0&&<tr><td colSpan={5}><Empty/></td></tr>}
                    {viajesMes.length>0&&<tr style={{background:'var(--gray-50)',fontWeight:700}}>
                      <td>TOTAL</td><td>{viajesMes.filter(v=>!v.es_interno).length}</td>
                      <td>{fmtGs(kmMes)} km</td><td>₲ {fmtGs(totalGs)}</td><td>$ {fmtUsd(totalUsd)}</td>
                    </tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Por chofer — {MESES[fMes]} {fAnio}</div></div>
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>Chofer</th><th>Viajes</th><th>Km</th><th>Total Gs.</th></tr></thead>
                  <tbody>
                    {choferes.map(c=>{
                      const vs=viajesMes.filter(v=>v.chofer===c.nombre)
                      if(!vs.length) return null
                      return <tr key={c.id}>
                        <td className="td-b">{c.nombre}</td>
                        <td>{vs.length}</td>
                        <td>{fmtGs(vs.reduce((a,v)=>a+(parseInt(v.km_recorridos)||0),0))} km</td>
                        <td>₲ {fmtGs(vs.reduce((a,v)=>a+(parseInt(v.precio_gs)||0),0))}</td>
                      </tr>
                    })}
                    {choferes.every(c=>viajesMes.filter(v=>v.chofer===c.nombre).length===0)&&<tr><td colSpan={4}><Empty/></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>}

        {/* ── TIPO DE CAMBIO ─────────────────────────────────────── */}
        {!loading&&tab==='tipocambio'&&<>
          <div className="ph">
            <div><div className="ph-title">Tipo de cambio</div><div className="ph-sub">Actualización manual diaria — fuente BCP</div></div>
          </div>
          {canEdit&&<div className="card" style={{maxWidth:440}}>
            <div className="card-header"><div className="card-title">Cargar tipo de cambio del día</div></div>
            <div className="card-body">
              <TipoCambioForm onSave={async rate=>{
                const {error}=await supabase.from('tipo_cambio').upsert([{fecha:today(),usd_gs:rate,fuente:'BCP'}],{onConflict:'fecha'})
                if(error){notify('Error','error');return}
                setTipoCambio({fecha:today(),usd_gs:rate,fuente:'BCP'})
                notify('Tipo de cambio actualizado')
              }}/>
            </div>
          </div>}
          <div className="card card-np">
            <div className="card-header"><div className="card-title">Historial</div></div>
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Fecha</th><th>USD → Gs.</th><th>Fuente</th></tr></thead>
                <tbody><TipoCambioHistorial/></tbody>
              </table>
            </div>
          </div>
        </>}
      </div>
    </div>
  </div>
}
