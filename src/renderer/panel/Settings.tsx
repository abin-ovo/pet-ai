import { useState } from 'react'
import type { Snapshot, RuntimeStatus, Settings as SettingsType } from '../../shared/types'
import type { PetBridge } from '../../shared/bridge'
import { Toggle } from '../components/Toggle'
export function Settings({ snapshot, status, bridge }: { snapshot: Snapshot; status: RuntimeStatus; bridge: PetBridge }) {
  const [name, setName] = useState(snapshot.pet.name), [endpoint, setEndpoint] = useState(snapshot.connection?.endpoint ?? ''), [model, setModel] = useState(snapshot.connection?.model ?? ''), [key, setKey] = useState(''), [notice, setNotice] = useState(''), [saving, setSaving] = useState(false), [confirmClear, setConfirmClear] = useState(false)
  const [checking, setChecking] = useState(false)
  const connectionChanged = endpoint.trim() !== snapshot.connection?.endpoint || model.trim() !== snapshot.connection?.model || Boolean(key.trim())
  const checkConnection = async () => {
    setChecking(true); setNotice('')
    try { setNotice((await bridge.checkConnection()).reason) }
    catch { setNotice('检测未完成，请稍后重试。') }
    finally { setChecking(false) }
  }
  const perform = async (action: () => Promise<unknown>, message = '已保存') => { setNotice(''); try { await action(); setNotice(message) } catch (e) { setNotice(e instanceof Error ? e.message : '没有保存成功，请检查输入后重试') } }
  const patch = (key: keyof SettingsType, value: boolean) => void perform(() => bridge.dispatch({ type: 'settings', patch: { [key]: value } }))
  return <section className="scroll-tab settings-tab"><h1>按你的节奏陪伴</h1><p className="section-description">让小团待在最舒服的位置。</p>
    <form className="rename-form" onSubmit={e => { e.preventDefault(); void perform(() => bridge.dispatch({ type: 'rename', name: name.trim() })) }}><label className="field">它的名字<div className="inline-field"><input maxLength={20} value={name} onChange={e => setName(e.target.value)}/><button className="secondary" disabled={!name.trim()}>保存</button></div></label></form>
    <div className="settings-group"><Toggle label="安静陪伴" description="安静休息，不走动、不发出声音" checked={snapshot.settings.quiet} onChange={v => patch('quiet', v)}/><Toggle label="互动音效" description="轻轻回应你的摸摸和照顾" checked={snapshot.settings.sound} onChange={v => patch('sound', v)}/><Toggle label="减少动态效果" description="让动作更平缓" checked={snapshot.settings.reducedMotion} onChange={v => patch('reducedMotion', v)}/><Toggle label="保持在窗口上方" checked={snapshot.settings.alwaysOnTop} onChange={v => patch('alwaysOnTop', v)}/><Toggle label="开机时见面" checked={snapshot.settings.launchAtLogin} onChange={v => patch('launchAtLogin', v)}/></div>
    <h2 className="settings-heading">聊天连接 <span>{status.connected ? '已配置' : '尚未连接'}</span></h2><p className="footnote">连接后，发送消息才会使用 AI。支持 Chat Completions 格式的 HTTPS 服务；填写完整请求地址。</p>
    <form className="connection-form" onSubmit={async e => { e.preventDefault(); setSaving(true); await perform(() => bridge.saveConnection({ endpoint: endpoint.trim(), model: model.trim() }, key.trim() || undefined), '连接已保存，可以去聊聊了'); setKey(''); setSaving(false) }}>
      <label className="field">服务地址<input type="url" required placeholder="https://…/v1/chat/completions" value={endpoint} onChange={e => setEndpoint(e.target.value)} autoComplete="off" spellCheck={false}/></label>
      <label className="field">模型名称<input required value={model} onChange={e => setModel(e.target.value)} autoComplete="off" placeholder="填写服务提供的模型名称"/></label>
      <label className="field">连接密钥<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="new-password" placeholder={status.connected ? '已安全保存；留空表示保持现有密钥' : '密钥仅保存在本机'}/></label>
      <div className="connection-actions"><button className="primary" disabled={saving}>{saving ? '正在保存…' : '保存连接'}</button><button type="button" className="secondary" disabled={!snapshot.connection || connectionChanged || saving || checking || status.busy} onClick={() => void checkConnection()}>{checking ? '检测中…' : '检测连接'}</button>{snapshot.connection ? <button type="button" className="text-button" onClick={() => void perform(async () => { await bridge.removeConnection(); setEndpoint(''); setModel('') }, '已移除聊天连接')}>移除连接</button> : null}</div>
    </form>
    <p className="footnote">请先保存更改，再检测连接。检测会发送一条简短测试消息，使用 API 额度；不包含聊天记录和回忆。</p>
    {notice ? <p role="status" className="settings-notice">{notice}</p> : null}
    <div className="data-settings"><h2>本机数据</h2><p className="footnote">宠物、聊天和回忆保存在这台电脑。清空聊天不会删除已确认的回忆。</p>{confirmClear ? <div className="confirm-clear"><span>确定清空全部聊天？</span><button className="text-button" onClick={() => { void perform(() => bridge.dispatch({ type: 'messages-clear' }), '聊天已清空，回忆仍保留'); setConfirmClear(false) }}>确定清空</button><button className="text-button" onClick={() => setConfirmClear(false)}>取消</button></div> : <button className="text-button" onClick={() => setConfirmClear(true)}>清空聊天记录</button>}<button className="text-button hide-pet" onClick={() => void bridge.hide()}>让小团暂时休息（隐藏）</button></div>
  </section>
}
