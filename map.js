// =====================================
// Supabaseの設定
// =====================================

const SUPABASE_URL =  'https://otfqzespcsrlwiymhwrp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hjlkihfo2HLPFutdQo167g_DKXVu7Sa';

// Supabaseクライアントを作成

const supabaseClient =
  supabase.createClient(

    SUPABASE_URL,

    SUPABASE_ANON_KEY

  );



// =====================================
// 地図の作成
// =====================================

const map = L.map("map").setView([34.790, 136.078], 14);

L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
  {
    attribution:
      '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
  }
).addTo(map);


// =====================================
// マーカーを保存
// =====================================

const markers = new Map();


// =====================================
// 初期表示：位置情報だけ取得
// =====================================

async function loadInitialObservations() {

  const { data, error } = await supabaseClient
    .from("observations")
    .select("id, latitude, longitude")
    .eq("approved", true);

  if (error) {
    console.error("データ取得エラー：", error);
    return;
  }

  console.log("取得件数：", data.length);

  data.forEach(observation => {
    addObservationMarker(observation);
  });
}


// =====================================
// マーカーを追加
// =====================================

function addObservationMarker(observation) {

  const latitude = Number(observation.latitude);
  const longitude = Number(observation.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    console.warn("緯度経度が不正です：", observation);
    return;
  }

  // 同じ投稿のマーカーがあれば重複させない
  if (markers.has(observation.id)) {
    return;
  }

  const marker = L.marker([
    latitude,
    longitude
  ]).addTo(map);

  // 最初は写真も詳細情報も読み込まない
  marker.bindPopup("投稿情報を読み込み中...");

  // マーカーをクリックしてポップアップが開いたとき
  marker.on("popupopen", () => {
    loadObservationDetails(observation.id, marker);
  });

  markers.set(observation.id, marker);
}


// =====================================
// クリック時：投稿の詳細と写真を取得
// =====================================

async function loadObservationDetails(id, marker) {

  // すでに読み込み済みなら再取得しない
  if (marker.observationDetails) {
    showObservationPopup(
      marker,
      marker.observationDetails
    );
    return;
  }

  marker.setPopupContent("投稿情報を読み込み中...");

  const { data, error } = await supabaseClient
    .from("observations")
    .select(
      "id, speciesName, observer, category, observedAt, comment, photo_url"
    )
    .eq("id", id)
    .eq("approved", true)
    .maybeSingle();

  if (error) {
    console.error("詳細取得エラー：", error);
    marker.setPopupContent("投稿情報を取得できませんでした");
    return;
  }

  if (!data) {
    marker.setPopupContent("この投稿は表示できません");
    return;
  }

  // 詳細情報を保存
  marker.observationDetails = data;

  showObservationPopup(marker, data);
}


// =====================================
// ポップアップを表示
// =====================================

function showObservationPopup(marker, observation) {

  const container = document.createElement("div");
  container.className = "popup-content";

  // 種名
  const title = document.createElement("h3");
  title.textContent = observation.speciesName || "種名不明";
  container.appendChild(title);

  // 写真がある場合だけ画像を読み込む
  if (observation.photo_url) {

    const image = document.createElement("img");

    image.className = "popup-image";
    image.alt = observation.speciesName || "観察写真";
    image.loading = "lazy";

    image.onerror = () => {
      image.alt = "写真を読み込めませんでした";
      image.style.display = "none";
    };

    image.src = observation.photo_url;

    container.appendChild(image);
  }

  // 詳細情報
  const details = [
    ["観察者", observation.observer || "不明"],
    ["カテゴリ", observation.category || "不明"],
    ["観察日時", observation.observedAt || "不明"],
    ["コメント", observation.comment || "なし"]
  ];

  details.forEach(([label, value]) => {

    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");

    strong.textContent = label + "：";

    paragraph.appendChild(strong);
    paragraph.appendChild(
      document.createTextNode(value)
    );

    container.appendChild(paragraph);
  });

  marker.setPopupContent(container);
}


// =====================================
// Supabase Realtime
// =====================================

function subscribeToObservations() {

  supabaseClient
    .channel("observations-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "observations"
      },
      payload => {

        const observation = payload.new;

        // 承認済みの投稿だけ地図に追加
        if (observation.approved === true) {
          addObservationMarker(observation);
        }

      }
    )
    .subscribe();
}


// =====================================
// 実行
// =====================================

loadInitialObservations();
subscribeToObservations();