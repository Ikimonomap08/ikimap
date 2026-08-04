const photoInput = document.getElementById("photoInput");
const nextBtn = document.getElementById("nextBtn");
const postBtn = document.getElementById("postBtn");
const newPostBtn = document.getElementById("newPostBtn");
const observerInput = document.getElementById("observer");
const category = document.getElementById("category");
const speciesInput = document.getElementById("speciesName");
const commentInput = document.getElementById("comment");

const fileInfo = document.getElementById("fileInfo");
const gpsInfo = document.getElementById("gpsInfo");
const dateInfo = document.getElementById("dateInfo");
const preview = document.getElementById("preview");

const toStep3 = document.getElementById("toStep3");
const SUPABASE_URL =  'https://otfqzespcsrlwiymhwrp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hjlkihfo2HLPFutdQo167g_DKXVu7Sa';

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let map;
let marker;
let observation = {};
let posting = false;

// =========================
// STEP切り替え
// =========================
function showStep(step) {
  
  document.getElementById("step1").style.display = "none";
  document.getElementById("step2").style.display = "none";
  document.getElementById("step3").style.display = "none";
  document.getElementById("step4").style.display = "none";

  document.getElementById("step" + step).style.display = "block";

  if (step === 3) {
    renderMap();
    renderConfirm();
  }
}

// =========================
// STEP3表示内容
// =========================
function renderConfirm() {
  document.getElementById("confirmText").innerHTML = `
    名前　　: ${observation.observer || ""}<br>
    カテゴリ: ${observation.category || ""}<br>
    生き物　: ${observation.speciesName || ""}<br>
    メモ　　: ${observation.comment || ""}
  `;
}

// =========================
// 地図（STEP3のみ）
// =========================
function renderMap() {

  

  if (!map) {
    map = L.map("map").setView(
      [observation.latitude, observation.longitude],
      16
    );

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  }
  
    if (marker) {
    map.removeLayer(marker);
  }
  

  marker = L.marker([
    observation.latitude,
    observation.longitude
  ]).addTo(map);

  setTimeout(() => map.invalidateSize(), 200);
}

// =========================
// STEP1：写真
// =========================
photoInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  observation.file = file;

  const sizeMB = (file.size / 1024 / 1024).toFixed(2);

  // ★STEP1で表示
  fileInfo.innerHTML = `
    ファイル名: ${file.name}<br>
    
  `;

  const reader = new FileReader();

  reader.onload = function (e) {
    document.getElementById("preview").src = e.target.result;
    //document.getElementById("preview").style.border = "5px solid red";

    console.log("プレビューセット完了");
    EXIF.getData(file, function () {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lon = EXIF.getTag(this, "GPSLongitude");

      const latRef = EXIF.getTag(this, "GPSLatitudeRef");
      const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

      const photoDate = EXIF.getTag(this, "DateTimeOriginal");

      observation.observedAt = photoDate;

      if (photoDate) {
        observation.observedAt =
        photoDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");

        dateInfo.innerHTML = ` 撮影日：${observation.observedAt}`;
      } 
      else {
        observation.observedAt = null;
        dateInfo.innerHTML = 
        `撮影日：取得できませんでした`;
      }

      if (lat && lon) {
        observation.latitude =
          lat[0] + lat[1] / 60 + lat[2] / 3600;

        observation.longitude =
          lon[0] + lon[1] / 60 + lon[2] / 3600;

          gpsInfo.innerHTML = `
          緯度：${observation.latitude.toFixed(6)}<br>
          経度：${observation.longitude.toFixed(6)} `;

      }

      else {
          gpsInfo.innerHTML = `
          GPS情報：なし
          `;
      }

      nextBtn.disabled = false;
    });
  };

  reader.readAsDataURL(file);
});

// STEP1 → STEP2
nextBtn.addEventListener("click", () => {
  showStep(2);
});

// STEP2 → STEP1
document.getElementById("backToStep1").addEventListener("click", () => {
  showStep(1);
});

// STEP2 → STEP3（入力保存）
toStep3.addEventListener("click", () => {

  // 名前が入力されているか確認
  if (observerInput.value.trim() === "") {
    alert("あなたの名前を入力してください");
    observerInput.focus();
    return;
  }
  observation.observer = observerInput.value;
  observation.category =
    category.options[category.selectedIndex].text;
  observation.speciesName = speciesInput.value;
  observation.comment = commentInput.value;

  showStep(3);
});

// STEP3 → STEP2
document.getElementById("backToStep2").addEventListener("click", () => {
  showStep(2);
});



// 投稿しましたの確認
postBtn.addEventListener("click", async() => {

  if (posting) return;   // 2回目以降は無視
  posting = true;

  postBtn.disabled = true;
  postBtn.textContent = "投稿中...";
  
  const file = photoInput.files[0];

  if (!file) {
    alert("写真が選択されていません");
    return;
  }

  // ファイル名
  const extension = file.name.split(".").pop();
  const fileName = `photo_${Date.now()}.${extension}`;
 

  // 写真をStorageにアップロード
  const { error: uploadError } = await supabaseClient
    .storage
    .from("observations")
    .upload(fileName, file);

  if (uploadError) {
    console.error("写真アップロードエラー:", uploadError);

      posting = false;
      postBtn.disabled = false;
      postBtn.textContent = "投稿する";

    alert("写真のアップロードに失敗しました\n" + uploadError.message);
    return;
  }

  // 写真URLを取得
  const { data: urlData } = supabaseClient
    .storage
    .from("observations")
    .getPublicUrl(fileName);

  const photoUrl = urlData.publicUrl;
    const { data, error } = await supabaseClient
    .from("observations")
    .insert([
      {
        observer: observation.observer,
        category: observation.category,
        speciesName: observation.speciesName,
        comment: observation.comment,
        observedAt: observation.observedAt,
        latitude: observation.latitude,
        longitude: observation.longitude,
        photo_url: photoUrl
      }
    ]);

  if (error) {
    console.error("保存エラー:", error);
    posting = false;
    postBtn.disabled = false;
    postBtn.textContent = "投稿する";
    alert("投稿に失敗しました\n" + error.message);
    return;
  }

  console.log("保存成功:", data);

  showStep(4);

});

 // 新しい投稿のボタン
newPostBtn.addEventListener("click", () => {

  // データを初期化
  observation = {};

  // フラグを戻す
  posting = false;

  // ボタンを元に戻す
  postBtn.disabled = false;
  postBtn.textContent = "投稿する";

  // 入力内容をリセット
  photoInput.value = "";
  observerInput.value = "";
  speciesInput.value = "";
  commentInput.value = "";
  category.selectedIndex = 0;

  // 表示をリセット
  preview.src = "";
  fileInfo.innerHTML = "";
  gpsInfo.innerHTML = "";
  dateInfo.innerHTML = "";
  document.getElementById("confirmText").innerHTML = "";

  //地図のマークを削除
  if (marker) {
  map.removeLayer(marker);
  marker = null;
  }

  marker = null;

  // 次へボタンを押せないようにする
  nextBtn.disabled = true;

  // STEP1へ戻る
  showStep(1);

});