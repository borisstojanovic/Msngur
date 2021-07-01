const multer = require('multer');

const fileStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'images/');
    },
    filename: function(req, file, cb) {
        const now = Date.now().toString();
        cb(null, now + file.originalname);
    }
});
const fileFilter = function(req, file, cb){
    if(file.mimetype === 'image/gif' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true);
    }else {
        cb(null, false);
    }
}
const images = multer({
    storage: fileStorage,
    limits: {
        fileSize: 1024 * 1024 * 4
    },
    fileFilter: fileFilter
});

module.exports = {
    images: images
}