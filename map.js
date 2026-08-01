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

const map =

  L.map("map")

    .setView(

      // 最初に表示する場所
      // 三重県周辺

      [34.5, 136.8],

      // ズームレベル

      9

    );


// =====================================
// 地理院地図を表示
// =====================================

L.tileLayer(

  "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",

  {

    attribution:

      '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'

  }

)

.addTo(map);


// =====================================
// マーカーを保存する
// =====================================

// 後で更新・削除するときに使う

const markers = new Map();


// =====================================
// Supabaseから現在のデータを取得
// =====================================

async function loadInitialObservations() {


  const {

    data,

    error

  } =

    await supabaseClient

      .from("observations")

      .select("*")
      .eq("approved", true)
      .order("observedAt", { ascending: false });


  // エラーがあった場合

  if (error) {
  console.error(
    "データ取得エラー：",
    error
  );

  return;
  } 

  console.log("取得件数：", data.length);
  console.log("取得データ：", data);


  console.log(

    "現在の観察データ：",

    data

  );


  // 取得したデータを1件ずつ処理

  data.forEach(

    observation => {

      console.log(
      "処理中の観察データ：",
      observation
      );

      addObservationMarker(

        observation

      );

    }

  );

}


// =====================================
// 観察データ1件のマーカーを追加
// =====================================

function addObservationMarker(

  observation

) {


  // 緯度

  const latitude =

    parseFloat(

      observation.latitude

    );


  // 経度

  const longitude =

    parseFloat(

      observation.longitude

    );


  // 緯度・経度が正しくない場合

  if (

    isNaN(latitude) ||

    isNaN(longitude)

  ) {

    console.warn(

      "緯度経度が不正です：",

      observation

    );

    return;

  }


  // =====================================
  // ポップアップ内容
  // =====================================

  const popupContent = `

    <div class="popup-content">


      <h3>

        ${observation.speciesName || "種名不明"}

      </h3>


      ${
        observation.photo_url

        ?

        `

          <img

            src="${observation.photo_url}"

            class="popup-image"

          >

        `

        :

        ""

      }


      <p>

        <strong>観察者：</strong>

        ${observation.observer || "不明"}

      </p>


      <p>

        <strong>カテゴリ：</strong>

        ${observation.category || "不明"}

      </p>


      <p>

        <strong>観察日時：</strong>

        ${observation.observedAt || "不明"}

      </p>


      <p>

        <strong>コメント：</strong><br>

        ${observation.comment || "なし"}

      </p>


    </div>

  `;


  // =====================================
  // マーカーを作成
  // =====================================

  const marker =

    L.marker(

      [

        latitude,

        longitude

      ]

    )

      .addTo(map)


      .bindPopup(

        popupContent

      );


  // =====================================
  // マーカーを保存
  // =====================================

  // idを使って保存

  if (

    observation.id

  ) {

    markers.set(

      observation.id,

      marker

    );

  }

}


// =====================================
// Supabase Realtime
// =====================================

function subscribeToObservations() {


  supabaseClient

    .channel(

      "observations-changes"

    )


    .on(

      "postgres_changes",

      {

        event: "INSERT",

        schema: "public",

        table: "observations"

      },


      payload => {


        console.log(

          "新しい観察データ：",

          payload.new

        );


        // 新しい1件だけを地図に追加

        addObservationMarker(

          payload.new

        );

      }

    )


    .subscribe();

}


// =====================================
// 実行
// =====================================


// ① 現在すでに入っているデータを表示

loadInitialObservations();


// ② その後、新しい投稿を監視

subscribeToObservations();