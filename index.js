import 'dotenv/config'
import express from 'express'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import fsp from 'fs/promises'
import fileupload from 'express-fileupload'
import path from 'path'
import hbs from 'hbs'

const app = express();
app.use(express.json())
app.use(fileupload())
app.use(express.static('server'))
app.use(express.urlencoded({ extended: true }));
app.set('views', 'views')
app.set('view engine', 'hbs')

const checkJWT = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET)
        return decoded
    } catch (err) {
        console.error('false jwt.')
        return null;
    }
}

app.post('/upload', async (req, res) => {
    try {
        const token = checkJWT(req.body.token)
        const { file } = req.files
        if (!token) return res.status(403).json({code: 403, message: "Token verification failed"})
        const {filename, project, filepath} = token
		if (!filename || !project || !filepath) return res.status(400).json({code: 400, message: "Not enough data."})
        if (project == 'upload') return res.status(400).json({code: 400, message: "Project name can't be 'upload'"})
        fs.mkdirSync(`server/${project}/${filepath}/`, {recursive: true})
        fs.writeFileSync(`server/${project}/${filepath}/${filename}`, file.data)
        return res.status(200).json({msg: "Success", filepath: `${project}/${filepath}/${filename}`})
    } catch (err) {
        console.error(err)
        return res.status(500).json({error: "Error occured."})
    }
})

app.delete('/delete', async (req, res) => {
    try {
        const token = checkJWT(req.query.token)
        if (!token) return res.status(403).json({code: 403, message: "Token verification failed"})
        const {project, filepath} = token
        if (!project || !filepath) return res.status(400).json({code: 400, message: "Not enough data."})
        if (project == 'upload') return res.status(400).json({code: 400, message: "Project name can't be 'upload'"})
        let file = `server/${project}/${filepath}`
        console.log(file)
        if (!fs.existsSync(file)) return res.status(404).json({code: 404, message: "File not found on server"})
        fs.unlinkSync(file)
        return res.status(200).json({msg: "Success"})
    } catch (err) {
        console.error(err)
        return res.status(500).json({error: "Error occured."})
    }
})

app.get('/', async (req, res) => {
    res.render('index')
})

app.get('/list/*', async (req, res) => {
    let { pass, path: dirPathUnmodif } = req.query
    if (pass != process.env.LIST_PASS) return res.status(403).json({code: 403, message: "Wrong password, access denied."})
    let dirPath = ''
    if (!dirPathUnmodif) dirPath = ''
    dirPath = "server/" + dirPathUnmodif

    try {
        const absolutePath = path.resolve(dirPath);

        if (!absolutePath.includes('server')) return res.status(403).json({code: 403, message: "You can't access anything not in SERVER folder"})
        const entries = await fsp.readdir(absolutePath, { withFileTypes: true });
        const folders = [];
        const files = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                folders.push({ name: entry.name, type: 'folder' });
            } else {
                files.push({ name: entry.name, type: 'file' });
            }
        }
        return res.render('list', { path: dirPathUnmodif, folders, files, pass })
    }
    catch (error) {
        console.error('Error reading directory:', error.message);
        return res.status(500).json({ error: 'Failed to read directory', details: error.message });
    }
})





app.get('/upload/*', r => r.res.status(400).json({code: 404, message: "Project name can't be 'upload'"}))
app.get('*', r => r.res.status(404).json({code: 404, message: "File not found"}))
app.listen(process.env.PORT, () => {
    console.log(`Server started.\nhttp://localhost:${process.env.PORT}/`)
})