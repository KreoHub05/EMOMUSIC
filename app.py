from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2, numpy as np, tensorflow as tf, os, requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

SPOTIFY_CLIENT_ID=os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET=os.getenv("SPOTIFY_CLIENT_SECRET")
GOOGLE_API_KEY=os.getenv("GOOGLE_API_KEY")

MODEL_PATH="emotion_model.h5"
model=tf.keras.models.load_model(MODEL_PATH)

EMOTIONS=["Angry","Disgust","Fear","Happy","Sad","Surprise","Neutral"]

def get_spotify_token():
    url="https://accounts.spotify.com/api/token"
    auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
    data={"grant_type":"client_credentials"}
    r=requests.post(url,auth=auth,data=data)
    return r.json().get("access_token")

def spotify_search(q):
    token=get_spotify_token()
    if not token: return []
    url=f"https://api.spotify.com/v1/search?q={q}&type=track&limit=5"
    h={"Authorization":f"Bearer {token}"}
    r=requests.get(url,headers=h)
    out=[]
    try:
        for t in r.json()["tracks"]["items"]:
            out.append({"title":t["name"],"artist":t["artists"][0]["name"],"url":t["external_urls"]["spotify"]})
    except: pass
    return out

@app.route("/detect",methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify({"error":"No image"}),400
    file=request.files["image"].read()
    img=cv2.imdecode(np.frombuffer(file,np.uint8),cv2.IMREAD_COLOR)
    gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    resized=cv2.resize(gray,(48,48))/255.0
    reshaped=resized.reshape(1,48,48,1)
    pred=model.predict(reshaped)
    idx=int(np.argmax(pred))
    emo=EMOTIONS[idx]
    songs=spotify_search(emo+" mood")
    return jsonify({"emotion":emo,"confidence":float(np.max(pred)),"songs":songs})

if __name__=="__main__":
    app.run(host="0.0.0.0",port=5000,debug=True)
