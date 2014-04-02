// ベンダープレフィックスの考慮
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL;

// Googleが提供するSTUNサーバーを指定し、RTCPeerConnectionを初期化する。
var peer = new RTCPeerConnection({
  "iceServers": [{"url": "stun:stun.l.google.com:19302"}]
});

// 自身に割り当てたGUID
var localGUID = guid();

// 接続先のGUID
var remoteGUID = null;

// WebSocketの初期化
var webSocket = new WebSocket('ws://127.0.0.1:8124/');

webSocket.onopen = function () {

  // 接続されたら自分に割り当てたGUIDを送信する
  var message = {
    username: 'Anonymous',
    guid: localGUID
  };
  webSocket.send(JSON.stringify(message));
};

webSocket.onmessage = function (e) {

  // メッセージを受け取った時にパースする
  var message = JSON.parse(e.data);

  // nameとguidをデータとしてセレクトボックスを生成する
  var select = document.getElementById('client-list');
  select.innerHTML = '';
  Object.keys(message.clients).forEach(function (guid) {
    if (guid !== localGUID) {
      var label = message.clients[guid] || guid;
      var option = document.createElement('option');
      option.value = guid;
      option.textContent = label;
      select.appendChild(option);
    }
  });

  // 送信されてくるメッセージのターゲットが自身のGUIDと一致する場合
  if (message.target === localGUID) {

    // 送信元を相手先とする
    remoteGUID = message.guid;

    // 送信元の情報でdescriptionを初期化
    var remoteDescription = new RTCSessionDescription(message.description);

    if (remoteDescription.type === 'offer') {

      // オファーの場合
      // ローカルのPeerオブジェクトに、リモートのdescriptionとしてセットする
      peer.setRemoteDescription(remoteDescription, function () {
        
        // アンサーの生成
        peer.createAnswer(function (localDescription) {
          
          // 自身のdescriptionをローカルのPeerオブジェクトにセット
          peer.setLocalDescription(localDescription, function () {

            // targetは送信元のGUIDを指定し
            // descriptionはcreateAnswerで生成したdescriptionを指定する
            var answer = {
              username: document.getElementById('local-username').value,
              guid: localGUID,
              target: message.guid,
              description: localDescription
            };

            // 自身のdescriptionと接続したいGUIDを送信する
            webSocket.send(JSON.stringify(answer));
          });
        }, errorCallback);
      });
    } else if (remoteDescription.type === 'answer') {
      
      // アンサーの場合
      // ローカルのPeerオブジェクトに、リモートのdescriptionとしてセットする
      peer.setRemoteDescription(remoteDescription, function () {
        
        // 重複してOfferしないように無効化する
        document.getElementById('connect').setAttribute('disabled', 'disabled');
      });
    }

    if (message.candidate) {

      // candidate文字列からRTCIceCandidateオブジェクトを復元する
      var iceCandidate = new RTCIceCandidate(message.candidate);

      // Peerオブジェクトにセット
      peer.addIceCandidate(iceCandidate);
    }
  }
};

document.addEventListener('DOMContentLoaded', function () {

  // ユーザーメディアを取得する
  navigator.getUserMedia({
    audio: true,
    video: true
  }, successCallback, errorCallback);

  // 更新された自分の名前をWebSocketサーバーに同期する
  document.getElementById('local-save').addEventListener('click', function () {

    var message = {
      username: document.getElementById('local-username').value,
      guid: localGUID
    };

    webSocket.send(JSON.stringify(message));
  });

  // 選択されているGUIDにP2P接続をオファーする
  document.getElementById('connect').addEventListener('click', function () {

    if (remoteGUID !== null) {
      return;
    }

    var clients = document.getElementById('client-list');
    remoteGUID = clients.options[clients.selectedIndex].value;

    // オファーの生成
    peer.createOffer(function (localDescription) {

      // 自身のdescriptionをローカルのPeerオブジェクトにセット
      peer.setLocalDescription(localDescription, function () {

        var offer = {
          username: document.getElementById('local-username').value,
          guid: localGUID,
          target: remoteGUID,
          description: localDescription
        };
        
        // 自身のdescriptionと接続したいGUIDを送信する
        webSocket.send(JSON.stringify(offer));
      });
    }, errorCallback);
  });
});

peer.onicecandidate = function (e) {

  if (e.candidate) {

    var message = {
      username: document.getElementById('local-username').value || 'Anonymous',
      guid: localGUID,
      target: remoteGUID,
      candidate: e.candidate
    };

    // 接続先にストリームに関する情報文字列（candidate）を送信する
    webSocket.send(JSON.stringify(message));
  }
};

peer.onaddstream = function (e) {

  // ストリームが追加されたら、リモートの映像として表示する
  var remoteVideo = document.getElementById('remote-video');
  remoteVideo.src = URL.createObjectURL(e.stream);
};

// ユーザーメディア取得成功時のコールバック関数
function successCallback(stream) {

  // ローカルのPeerオブジェクトに自身のメディアストリームを追加する
  peer.addStream(stream);

  // 自身のメディアストリームをブラウザに表示する
  var localVideo = document.getElementById('local-video');
  localVideo.src = URL.createObjectURL(stream);
}

// ユーザーメディア取得失敗時、createOffer、createAnswerのコールバック関数
function errorCallback(error) {
  console.log(error);
}