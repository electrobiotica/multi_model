
from flask import Flask, render_template

app = Flask(__name__, static_url_path='/static')

@app.route("/")
def index():
    return render_template("index.html")

import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  # Render lo inyecta automáticamente
    app.run(host="0.0.0.0", port=port, debug=False)

