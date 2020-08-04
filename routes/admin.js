const express = require('express')
const Auth = require('../middlewares/auth')
const Admin = require('../models/admin')
const md5 = require('md5')
const bcrypt = require('bcryptjs')
const path = require('path')
const router = express.Router()

const { IncomingForm } = require('formidable')
const adminFormOptions = {
  uploadDir: path.join(__dirname, '../public', 'images'),
  keepExtensions: true,
  maxFileSize: 10 * 1024 * 1024,
  multiples: false
}
const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]

router.get('/', function (req, res) {
  Admin.findOne()
    .lean({ virtuals: true })
    .exec((err, admin) => {
      if (err) { return res.status(502).json({ message: 'Falha ao buscar conta' }) }
      if (!admin) { return res.status(500).json({ message: 'Crie a conta de administrador' }) }
      if (req.query.gravatar) {
        const gravatar = `https://www.gravatar.com/avatar/${md5(admin.email.toLowerCase())}?s=200&d=retro`
        return res.json(gravatar)
      }
      delete admin.email;
      delete admin.password;
      res.json(admin)
    })
})
router.post('/', Auth, function (req, res) {
  const form = new IncomingForm(adminFormOptions)
  form.on("fileBegin", function (filename, file) {
    file.path = path.join(form.uploadDir, file.name)
  })
  form.onPart = (part) => {
    if (part.mime) {
      if (!allowedTypes.includes(part.mime)) {
        req.destroy()
        return res.status(415).json({ message: 'Mime-type inválido' })
      }
    }
    form.handlePart(part)
  }
  form.parse(req, function (err, fields, files) {
    if (err) { return res.status(400).json({ message: 'Formulário inválido' }) }
    let admin = new Admin({
      name: fields.name,
      last_name: fields.last_name,
      birthdate: new Date(fields.birthdate),
      address: {},
      email: fields.email,
      password: bcrypt.hashSync(fields.password, 10),
      photo: fields.photo ? `${req.protocol}://${req.get('host')}/images/${files.photo.name}` : `https://www.gravatar.com/avatar/${md5(fields.email.toLowerCase())}?s=200&d=identicon`,
      profession: fields.profession,
      biodata: fields.biodata
    })
    if (fields.city) admin.address.city = fields.city
    if (fields.state) admin.address.state = fields.state
    if (files.logo) admin.logo = `${req.protocol}://${req.get('host')}/images/${files.logo.name}`
    if (fields.nickname) admin.nickname = fields.nickname
    if (fields.skills) admin.skills = JSON.parse(fields.skills)
    if (fields.social) admin.social = JSON.parse(fields.social)
    admin.save((err) => {
      if (err) { return res.status(502).json({ message: 'Falha ao criar' }) }
      res.status(200).json({ message: 'Conta administrador criada!' })
    })
  })
})

router.put('/:id', Auth, function (req, res) {
  const form = new IncomingForm(adminFormOptions)
  form.on("fileBegin", function (filename, file) {
    file.path = path.join(form.uploadDir, file.name)
  })
  form.onPart = (part) => {
    if (part.mime) {
      if (!allowedTypes.includes(part.mime)) {
        req.destroy()
        return res.status(415).json({ message: 'Mime-type inválido' })
      }
    }
    form.handlePart(part)
  }
  Admin.findById(req.params.id)
    .lean()
    .exec((err, account) => {
      if (err | !account) { return res.status(502).json({ message: 'Falha ao encontrar conta' }) }
      form.parse(req, function (err, fields, files) {
        if (err) { return res.status(400).json({ message: 'Formulário inválido' }) }
        let admin = {}
        Object.assign(admin, account)
        if (files.photo) {
          admin = new Admin(admin)
          admin.photo = `${req.protocol}://${req.get('host')}/images/${files.photo.name}`
          admin.updateOne(admin, (err, result) => {
            if (err || !result.n) { return res.status(502).json({ message: 'Falha ao salvar' }) }
            res.status(200).json({ message: 'Foto atualizada!' })
          })
        } else if (files.logo) {
          admin = new Admin(admin)
          admin.logo = `${req.protocol}://${req.get('host')}/images/${files.logo.name}`
          admin.updateOne(admin, (err, result) => {
            if (err || !result.n) { return res.status(502).json({ message: 'Falha ao salvar' }) }
            res.status(200).json({ message: 'Foto atualizada!' })
          })
        }
        admin = new Admin({
          _id: fields._id,
          name: fields.name || admin.name,
          last_name: fields.last_name || admin.last_name,
          birthdate: fields.birthdate ? new Date(fields.birthdate) : admin.birthdate,
          email: fields.email || admin.email,
          password: fields.password ? bcrypt.hashSync(fields.password, 10) : admin.password,
          photo: admin.photo,
          biodata: fields.biodata || admin.biodata,
          profession: fields.profession || admin.profession,
          logo: files.logo ? `${req.protocol}://${req.get('host')}/images/${files.logo.name}` : admin.logo,
          skills: fields.skills ? JSON.parse(fields.skills) : admin.skills,
          social: fields.social ? JSON.parse(fields.social) : admin.social
        })
        if (fields.city || fields.state) {
          if (fields.city) admin.address.city = fields.city
          if (fields.state) admin.address.state = fields.state
          admin.markModified('address')
        }
        admin.updateOne(admin, (err, result) => {
          if (err || !result.n) { return res.status(502).json({ message: 'Falha ao atualizar' }) }
          res.status(200).json({ message: 'Dados atualizados!' })
        })
      })
    })
})
router.delete('/:id', Auth, function (req, res) {
  Admin.deleteOne({ _id: req.params.id }, (err) => {
    if (err) { return res.status(502).json({ message: 'Falha ao deletar' }) }
    res.status(200).json({ message: 'Conta deletada.' })
  })
})

module.exports = router
