/**
 * Supabase接続・顧客CRUD処理
 */

const SUPABASE_URL = 'https://clzxejqhnsermtbuyizs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_H01W0MiX-7lxHY9tn9DZ8Q_uDJnQTNa';

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 顧客専用ページのベースURL
const CLIENT_PAGE_BASE = 'https://ev-simulator-beige.vercel.app/client.html';

/**
 * 顧客一覧取得（作成日降順）
 */
async function getClients() {
  const { data, error } = await _supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error('顧客一覧の取得に失敗しました: ' + error.message);
  return data;
}

/**
 * 顧客1件取得（UUID）
 */
async function getClientById(id) {
  const { data, error } = await _supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error('顧客データの取得に失敗しました: ' + error.message);
  return data;
}

/**
 * 顧客登録
 */
async function createClient(clientData) {
  const { data, error } = await _supabase
    .from('clients')
    .insert([clientData])
    .select()
    .single();
  if (error) throw new Error('顧客の登録に失敗しました: ' + error.message);
  return data;
}

/**
 * 顧客更新
 */
async function updateClient(id, clientData) {
  const { data, error } = await _supabase
    .from('clients')
    .update({ ...clientData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error('顧客の更新に失敗しました: ' + error.message);
  return data;
}

/**
 * 顧客削除
 */
async function deleteClient(id) {
  const { error } = await _supabase
    .from('clients')
    .delete()
    .eq('id', id);
  if (error) throw new Error('顧客の削除に失敗しました: ' + error.message);
}

/**
 * 専用URL生成
 */
function getClientUrl(id) {
  return CLIENT_PAGE_BASE + '?id=' + id;
}

// グローバル公開
window.SupabaseClient = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientUrl,
};
