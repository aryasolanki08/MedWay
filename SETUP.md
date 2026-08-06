# Setup (read this after unzipping)

`node_modules/` (frontend) and `venv/` (backend) are intentionally **not** included in
this zip to keep it small. That means `vite`, `django`, etc. are not installed yet in
this folder, even if you installed them before in a previous copy.

Every time you unzip a fresh copy of this project, run these before anything else:

**Frontend**
```
cd frontend
npm install
npm run dev
```

**Backend**
```
cd backend
python -m venv venv
venv\Scripts\activate      (Windows)   or   source venv/bin/activate   (Mac/Linux)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

If you see `'vite' is not recognized as an internal or external command`, it means
`npm install` hasn't been run yet in this particular folder -- that's the fix.
