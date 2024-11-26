import 'dotenv/config'
import express from 'express'
import jwt from 'jsonwebtoken'
import fs from 'fs'

const app = express();
app.use(express.json())
app.use(express.static('server'))
app.use(express.urlencoded({ extended: true }));

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
        if (project == 'upload') res.status(400).json({code: 404, message: "Project name can't be 'upload'"})
        fs.mkdirSync(`server/${project}/${filepath}/`, {recursive: true})
        fs.writeFileSync(`server/${project}/${filepath}/${filename}`, file.data)
        console.log(token, file)
    } catch (err) {
        console.error(err)
        return res.status(500).json({error: "Error occured."})
    }
})

app.get('/upload/*', r => r.res.status(400).json({code: 404, message: "Project name can't be 'upload'"}))
app.get('*', r => r.res.status(404).json({code: 404, message: "File not found"}))
app.listen(process.env.port, () => {
    console.log(`Server started.\nhttp://localhost:${process.env.port}/`)
})