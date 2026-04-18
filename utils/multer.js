
const multer = require("multer");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/")
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }

});


const fileFilter = (req, file, cb) => {
    const allowedFilter = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    ]

    if (allowedFilter.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error("Only PDF and DOC files are allowed"), false);
    }
}


const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

module.exports = upload;

