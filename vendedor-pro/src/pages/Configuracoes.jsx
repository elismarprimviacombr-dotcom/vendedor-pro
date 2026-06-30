import React,{useEffect,useState}from'react';
import Modal from'../components/Modal';
import{useAuth}from'../context/AuthContext';
import{useToast}from'../context/ToastContext';
import{supabase}from'../services/supabaseClient';

export default function Configuracoes(){
  const{perfil,isAdmin}=useAuth();
  const{notify,notifyError}=useToast();
  const[nome,setNome]=useState(perfil?.nome||'');
  const[usuarios,setUsuarios]=useState([]);
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({nome:'',email:'',senha:'',papel:'vendedor'});
  const[salvando,setSalvando]=useState(false);

  useEffect(()=>{
    if(isAdmin)supabase.from('usuarios').select('*').order('nome').then(({data})=>setUsuarios(data||[]));
  },[isAdmin]);

  async function salvarPerfil(e){
    e.preventDefault();
    const{error}=await supabase.from('usuarios').update({nome}).eq('id',perfil.id);
    if(error)notifyError(error);else notify('Nome atualizado.');
  }

  async function mudarPapel(id,papel){
    const{error}=await supabase.from('usuarios').update({papel}).eq('id',id);
    if(error)notifyError(error,'Não foi possível atualizar o papel');
    else{notify('Papel atualizado.');const{data}=await supabase.from('usuarios').select('*').order('nome');setUsuarios(data||[]);}
  }

  async function criarUsuario(e){
    e.preventDefault();setSalvando(true);
    const{data,error}=await supabase.functions.invoke('criar-usuario',{body:{email:form.email,senha:form.senha,nome:form.nome,papel:form.papel}});
    if(error||data?.error)notifyError(error||new Error(data?.error),'Erro ao criar usuário');
    else{notify(`Usuário ${form.nome} criado.`);setModal(false);setForm({nome:'',email:'',senha:'',papel:'vendedor'});const{data:u}=await supabase.from('usuarios').select('*').order('nome');setUsuarios(u||[]);}
    setSalvando(false);
  }

  return(
    <div className="content">
      <div className="page-head"><div><h1>Configurações</h1><p>Sua conta e o time</p></div></div>
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h2>Minha conta</h2></div>
          <form onSubmit={salvarPerfil}>
            <div className="field"><label>Nome</label><input value={nome} onChange={e=>setNome(e.target.value)}/></div>
            <div className="field"><label>E-mail</label><input value={perfil?.email||''} disabled style={{opacity:.6}}/></div>
            <button className="btn btn-primary" type="submit">Salvar</button>
          </form>
          <p className="help-text" style={{marginTop:12}}>Para trocar a senha, use "Esqueci minha senha" na tela de login.</p>
        </div>

        {isAdmin&&(
          <div className="panel">
            <div className="panel-head"><h2>Usuários</h2><button className="btn btn-primary btn-sm" onClick={()=>setModal(true)}>+ Novo usuário</button></div>
            <table>
              <thead><tr><th>Nome</th><th>Papel</th></tr></thead>
              <tbody>{usuarios.map(u=>(
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td><select value={u.papel} onChange={e=>mudarPapel(u.id,e.target.value)}>
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select></td>
                </tr>
              ))}</tbody>
            </table>
            <p className="help-text" style={{marginTop:10}}>O sistema impede rebaixar o último administrador.</p>
          </div>
        )}
      </div>
      {modal&&(
        <Modal title="Novo usuário" onClose={()=>setModal(false)}>
          <form onSubmit={criarUsuario}>
            <div className="field"><label>Nome *</label><input required value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div>
            <div className="field"><label>E-mail *</label><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div className="field"><label>Senha provisória *</label><input type="text" required minLength={6} value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})}/></div>
            <div className="field"><label>Papel</label>
              <select value={form.papel} onChange={e=>setForm({...form,papel:e.target.value})}>
                <option value="vendedor">Vendedor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando?'Criando...':'Criar usuário'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
