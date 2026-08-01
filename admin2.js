// ================================
// Supabase接続
// ================================

const SUPABASE_URL =  'https://otfqzespcsrlwiymhwrp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hjlkihfo2HLPFutdQo167g_DKXVu7Sa';


const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


// ================================
// HTML要素
// ================================

const loginSection =
  document.getElementById("loginSection");


const adminSection =
  document.getElementById("adminSection");


const logoutBtn =
  document.getElementById("logoutBtn");


const loginBtn =
  document.getElementById("loginBtn");


const emailInput =
  document.getElementById("emailInput");


const passwordInput =
  document.getElementById("passwordInput");


const loginMessage =
  document.getElementById("loginMessage");


const observationsList =
  document.getElementById("observationsList");


const adminMessage =
  document.getElementById("adminMessage");


// ================================
// ページ読み込み時
// ================================

checkLogin();


// ================================
// ログイン状態を確認
// ================================

async function checkLogin() {

  const {

    data: {
      session

    }

  } = await supabaseClient
    .auth
    .getSession();


  if (session) {

    showAdminPage();

  }

  else {

    showLoginPage();

  }

}


// ================================
// ログイン
// ================================

loginBtn.addEventListener(

  "click",

  async () => {


    const email =
      emailInput.value;


    const password =
      passwordInput.value;


    if (!email || !password) {

      loginMessage.textContent =
        "メールアドレスとパスワードを入力してください。";

      return;

    }


    const {

      data,

      error

    } = await supabaseClient
      .auth
      .signInWithPassword({

        email: email,

        password: password

      });


    if (error) {

      console.error(error);


      loginMessage.textContent =
        "ログインに失敗しました。";

      return;

    }


    showAdminPage();

  }

);


// ================================
// 管理画面を表示
// ================================

function showAdminPage() {

  loginSection.style.display =
    "none";


  adminSection.style.display =
    "block";


  logoutBtn.style.display =
    "block";


  loadObservations();

}


// ================================
// ログイン画面を表示
// ================================

function showLoginPage() {

  loginSection.style.display =
    "flex";


  adminSection.style.display =
    "none";


  logoutBtn.style.display =
    "none";

}


// ================================
// ログアウト
// ================================

logoutBtn.addEventListener(

  "click",

  async () => {


    await supabaseClient
      .auth
      .signOut();


    showLoginPage();

  }

);


// ================================
// 投稿一覧を取得
// ================================

async function loadObservations() {

  observationsList.innerHTML = "読み込み中...";

  const {
    data,
    error
  } = await supabaseClient
    .from("observations")
    .select("*");

  console.log("取得したデータ:", data);
  console.log("エラー:", error);

  if (error) {

    console.error(error);

    observationsList.innerHTML =
      "投稿の取得に失敗しました。";

    return;
  }

  observationsList.innerHTML = "";

  if (!data || data.length === 0) {

    observationsList.innerHTML =
      "<p>投稿はありません。</p>";

    return;
  }

  data.forEach(observation => {

    const card =
      document.createElement("div");

    card.className =
      "observation-card";

    card.innerHTML = `

      <img
        src="${observation.photo_url}"
        alt="投稿写真"
      >

      <div class="observation-info">

        <h3>
          ${observation.speciesName || "種名なし"}
        </h3>

        <p>
          観察者：
          ${observation.observer || "不明"}
        </p>

        <p>
          カテゴリ：
          ${observation.category || "なし"}
        </p>

        <p>
          コメント：
          ${observation.comment || "なし"}
        </p>

        <p>
          観察日時：
          ${observation.observedAt || "不明"}
        </p>

        <p>
          状態：
             ${observation.approved ? "✅ 承認済み" : "⏳ 未承認"}
        </p>

        <button
          class="${observation.approved ? "unapprove-btn" : "approve-btn"}"
          data-id="${observation.id}"
        >
          ${observation.approved ? "承認を取り消す" : "承認する"}
        </button>

        <button
          class="delete-btn"
          data-id="${observation.id}"
        >
          この投稿を削除
        </button>

      </div>

    `;

    observationsList.appendChild(card);

  });

  setupApproveButtons();
  setupDeleteButtons();


}


  // 承認ボタンにイベントを追加

  function setupApproveButtons() {

  document.querySelectorAll(".approve-btn")
    .forEach(button => {

      button.addEventListener("click", () => {
        approveObservation(button.dataset.id);
      });

    });

  document.querySelectorAll(".unapprove-btn")
    .forEach(button => {

      button.addEventListener("click", () => {
        unapproveObservation(button.dataset.id);
      });

    });

}


  // 削除ボタンにイベントを設定
function setupDeleteButtons() {

  document
    .querySelectorAll(".delete-btn")
    .forEach(

      button => {


        button.addEventListener(

          "click",

          () => {

            const id =
              button.dataset.id;


            deleteObservation(id);

          }

        );

      }

    );
}

// ================================
// 承認する
// ================================

async function approveObservation(id) {

  const { error } = await supabaseClient
    .from("observations")
    .update({ approved: true })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("承認に失敗しました。");
    return;
  }

  loadObservations();
}


// ================================
// 承認を取り消す
// ================================
async function unapproveObservation(id) {

  const { error } = await supabaseClient
    .from("observations")
    .update({ approved: false })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("承認の取り消しに失敗しました。");
    return;
  }

  loadObservations();
}

// ================================
// 投稿を削除
// ================================

async function deleteObservation(id) {

  const result =
    confirm("この投稿を本当に削除しますか？");

  if (!result) {
    return;
  }

  // ① 投稿情報を取得
  const {
    data: observation,
    error: fetchError
  } = await supabaseClient
    .from("observations")
    .select("photo_url")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error(fetchError);
    alert("投稿情報の取得に失敗しました。");
    return;
  }

  // ② Storageの画像を削除
  if (observation.photo_url) {

    // URLからStorage内のファイル名を取得
    const filePath =
      observation.photo_url.split("/observations/")[1];

    const {
      error: storageError
    } = await supabaseClient
      .storage
      .from("observations")
      .remove([filePath]);

    if (storageError) {
      console.error(storageError);
      alert("画像の削除に失敗しました。");
      return;
    }
  }

  // ③ observationsテーブルから削除
  const {
    error
  } = await supabaseClient
    .from("observations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);

    alert("投稿の削除に失敗しました。");
    return;
  }

  alert("投稿を削除しました。");

  loadObservations();
}