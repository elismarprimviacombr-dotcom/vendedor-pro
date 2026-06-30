import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{signIn,resetPasswordForEmail}from'../services/authService';

function mensagemErro(err){
  const m=err?.message||'';
  if(m.includes('invalid_credentials')||m.includes('Invalid login'))return'E-mail ou senha incorretos.';
  if(m.includes('rate limit'))return'Muitas tentativas. Aguarde um minuto.';
  return m||'Não foi possível entrar agora.';
}

export default function Login(){
  const navigate=useNavigate();
  const[email,setEmail]=useState('');
  const[senha,setSenha]=useState('');
  const[erro,setErro]=useState('');
  const[loading,setLoading]=useState(false);
  const[mostrarSenha,setMostrarSenha]=useState(false);

  async function submit(e){
    e.preventDefault();setErro('');setLoading(true);
    try{await signIn(email,senha);navigate('/dashboard');}
    catch(err){setErro(mensagemErro(err));}
    finally{setLoading(false);}
  }

  async function esqueciSenha(){
    if(!email){setErro('Digite seu e-mail primeiro.');return;}
    try{await resetPasswordForEmail(email);alert('Link de redefinição enviado para seu e-mail.');}
    catch(err){setErro(mensagemErro(err));}
  }

  return(
    <div className="login-page">
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontWeight:800,fontSize:22,letterSpacing:'-0.02em'}}>
            VENDEDOR <span style={{color:'var(--green-light)'}}>PRO</span>
          </div>
          <div style={{fontSize:11,color:'var(--muted)',letterSpacing:'.06em',marginTop:4}}>CONTROLE · PROSPECÇÃO · RESULTADOS</div>
        </div>
        <div className="panel" style={{padding:'24px 22px'}}>
          <h2 style={{marginBottom:4,fontSize:17}}>Bem-vindo de volta!</h2>
          <p style={{color:'var(--muted)',fontSize:12,marginBottom:18}}>Faça login para continuar</p>
          <form onSubmit={submit}>
            <div className="field"><label>E-mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></div>
            <div className="field">
              <label>Senha</label>
              <div style={{position:'relative'}}>
                <input type={mostrarSenha?'text':'password'} required value={senha} onChange={e=>setSenha(e.target.value)} autoComplete="current-password" style={{paddingRight:36}}/>
                <button type="button" onClick={()=>setMostrarSenha(!mostrarSenha)} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--muted)',cursor:'pointer',padding:2}}>
                  {mostrarSenha?'🙈':'👁'}
                </button>
              </div>
            </div>
            {erro&&<p style={{color:'var(--red)',fontSize:12,marginBottom:10}}>{erro}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%',justifyContent:'center',marginBottom:10}}>
              {loading?'Entrando...':'Entrar'}
            </button>
          </form>
          <button type="button" onClick={esqueciSenha} style={{background:'none',border:'none',color:'var(--green-light)',fontSize:12,cursor:'pointer',padding:0}}>
            Esqueci minha senha
          </button>
          <p className="help-text" style={{marginTop:14}}>Não tem conta? Peça a um administrador em <strong>Configurações → Usuários</strong>.</p>
        </div>
      </div>
    </div>
  );
}
