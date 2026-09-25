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
const manualDateArea = document.getElementById("manualDateArea");
const manualDate = document.getElementById("manualDate");
const browserGpsArea = document.getElementById("browserGpsArea");
const getBrowserGpsBtn = document.getElementById("getBrowserGpsBtn");
const browserGpsInfo = document.getElementById("browserGpsInfo");

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
// 次へボタンの状態確認
// =========================

function updateNextButton() {

  const hasGps =
    observation.latitude != null &&
    observation.longitude != null;

  const hasDate =
    observation.observedAt != null &&
    observation.observedAt !== "";

  nextBtn.disabled =
    !(hasGps && hasDate);
}

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
  //位置情報なしverを追加
  if (
    observation.latitude == null ||
    observation.longitude == null
  ) {
    console.log("位置情報がないため地図を表示できません");
    return;
  }

  if (!map) {
    map = L.map("map").setView(
      [observation.latitude, observation.longitude],
      16
    );

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  } else {

    map.setView(
      [
        observation.latitude,
        observation.longitude
      ],
      16
    );
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

  // 前の写真の位置情報を消す
  observation.latitude = null;
  observation.longitude = null;
  // ブラウザGPS表示をリセット
  browserGpsArea.style.display = "none";
  browserGpsInfo.innerHTML = "";
  // GPSが決まるまでは次へを押せない
  nextBtn.disabled = true;

  observation.file = file;

  const sizeMB = (file.size / 1024 / 1024).toFixed(2);

    

  // =========================
  // 写真プレビュー
  // =========================
  const reader = new FileReader();

  reader.onload = function (e) {
    document.getElementById("preview").src = e.target.result;
    //document.getElementById("preview").style.border = "5px solid red";

    console.log("プレビューセット完了");
  // =========================
  // EXIF取得
  // =========================
    EXIF.getData(file, function () {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lon = EXIF.getTag(this, "GPSLongitude");

      const latRef = EXIF.getTag(this, "GPSLatitudeRef");
      const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

      const photoDate = EXIF.getTag(this, "DateTimeOriginal");
  // =========================
  // 撮影日時
  // =========================

      observation.observedAt = photoDate;

      if (photoDate) {
        observation.observedAt =
        photoDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");

        dateInfo.innerHTML = ` 撮影日：${observation.observedAt}`;
      } 
      else {
        observation.observedAt = null;
        dateInfo.innerHTML = "";
      }
      // EXIFから取得できなかった場合だけ
      // 撮影日時の入力欄を表示
      manualDateArea.style.display = "block";
      manualDate.value = "";

      // EXIFからGPS取得成功した場合
        if (lat && lon) {
        observation.latitude =
          lat[0] + lat[1] / 60 + lat[2] / 3600;

        observation.longitude =
          lon[0] + lon[1] / 60 + lon[2] / 3600;

          gpsInfo.innerHTML = `
          緯度：${observation.latitude.toFixed(6)}<br>
          経度：${observation.longitude.toFixed(6)} `;
        
        browserGpsArea.style.display = "none";

        // GPSが取れたので次へ進める
              updateNextButton();

      }

        // EXIFにGPSがない場合
      else {
       gpsInfo.innerHTML = "GPS情報：写真から取得できませんでした";
       // 現在地取得エリアを表示
       browserGpsArea.style.display = "block";
       // 余計な案内文は表示しない
       browserGpsInfo.innerHTML = "";

       // まだ位置情報がないので進めない
       nextBtn.disabled = true;
      }

    });
  };

  reader.readAsDataURL(file);
});

// =========================
// 撮影日時を手動入力
// =========================

manualDate.addEventListener(
  "change",
  function () {

    if (this.value) {observation.observedAt = this.value;
    } else { observation.observedAt = null;}

    updateNextButton();
  }
);

// =========================
// ブラウザから現在地を取得
// =========================

getBrowserGpsBtn.addEventListener(
  "click",
  function () {

    if (!navigator.geolocation) {

      browserGpsInfo.innerHTML =
        "このブラウザでは位置情報を取得できません。";

      return;
    }


    browserGpsInfo.innerHTML =
      "現在地を取得しています...";


    getBrowserGpsBtn.disabled =
      true;


    navigator.geolocation.getCurrentPosition(

      // =========================
      // 取得成功
      // =========================

      function (position) {

        observation.latitude =
          position.coords.latitude;

        observation.longitude =
          position.coords.longitude;


        gpsInfo.innerHTML = `
          GPS：ブラウザの現在地から取得<br>
          緯度：${observation.latitude.toFixed(6)}<br>
          経度：${observation.longitude.toFixed(6)}
        `;

          // 現在地取得エリアを消す
          browserGpsArea.style.display =
            "none";


          ;
          // GPS取得成功
          nextBtn.disabled =
            false;


      },


      // =========================
      // 取得失敗
      // =========================

      function (error) {

        console.error(
          "現在地取得エラー:",
          error
        );


        getBrowserGpsBtn.disabled =
          false;


        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {

          browserGpsInfo.innerHTML =
            "位置情報の使用が許可されませんでした。<br>" +
            "ブラウザの設定で位置情報を許可してください。";

        }

        else if (
          error.code ===
          error.POSITION_UNAVAILABLE
        ) {

          browserGpsInfo.innerHTML =
            "現在地を取得できませんでした。";

        }

        else if (
          error.code ===
          error.TIMEOUT
        ) {

          browserGpsInfo.innerHTML =
            "現在地の取得がタイムアウトしました。<br>" +
            "もう一度お試しください。";

        }

        else {

          browserGpsInfo.innerHTML =
            "現在地の取得に失敗しました。";
        }


        nextBtn.disabled =
          true;
      },


      // =========================
      // 現在地取得設定
      // =========================

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }
);


// STEP1 → STEP2
nextBtn.addEventListener(
  "click",
  () => {

    if (
      observation.latitude == null ||
      observation.longitude == null
    ) {

      alert(
        "位置情報を取得してください"
      );

      return;
    }

    showStep(2);
  }
);

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
     posting = false;
     postBtn.disabled = false;
     postBtn.textContent = "投稿する";
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

  // observationsテーブルへ保存
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
  manualDateArea.style.display = "none";
  manualDate.value = "";
  document.getElementById("confirmText").innerHTML = "";
  //ブラウザのGPSもリセット
  browserGpsArea.style.display = "none";
  browserGpsInfo.innerHTML = "";
  getBrowserGpsBtn.disabled = false;

  //地図のマークを削除
  if (marker) {
  map.removeLayer(marker);
  marker = null;
  }

  // 次へボタンを押せないようにする
  nextBtn.disabled = true;

  // STEP1へ戻る
  showStep(1);

});