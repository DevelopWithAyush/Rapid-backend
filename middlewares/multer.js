import multer from 'multer'

const multerUpload = multer({
    limits: {
        fileSize:1024*1024*5, //this will define that the file size not more then 5mb
    }
})

const singelAvatar = multerUpload.single("avatar");
const attachmentsMulter = multerUpload.array("files")


export { singelAvatar, attachmentsMulter };