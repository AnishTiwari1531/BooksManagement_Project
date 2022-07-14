const booksModel = require("../models/booksModel")
const userModel = require("../models/userModel")
const reviewModel = require("../models/reviewModel")
const validate = require("../validation/validation")
const aws = require("aws-sdk")

//------------------------------------------------------------------//

aws.config.update({
    accessKeyId: "AKIAY3L35MCRVFM24Q7U",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile= async ( file) =>{
   return new Promise( function(resolve, reject) {
    // this function will upload file to aws and return the link
    let s3= new aws.S3({apiVersion: '2006-03-01'}); // we will be using the s3 service of aws

    var uploadParams= {
        ACL: "public-read",
        Bucket: "classroom-training-bucket",  //HERE
        Key: "abc/" + file.originalname, //HERE 
        Body: file.buffer
    }


    s3.upload( uploadParams, function (err, data ){
        if(err) {
            return reject({"error": err})
        }
        console.log(data)
        console.log("file uploaded succesfully")
        return resolve(data.Location)
    })
   })
}


//--------------------------------------------------------------------//

const bookCreation = async function (req, res) {
    try {
        let data = req.body;
        const { title, excerpt, userId, ISBN, category, subcategory, releasedAt } = data

        if (!validate.isValidBody(data)) {
            return res.status(400).send({ status: false, message: "Please provide data ⚠️" })
        }

        if (!validate.isValid(userId)) {
            return res.status(400).send({ status: false, message: "Please provide userId ⚠️" });
        }

        if (!validate.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Please Provide a valid userId in body ⚠️" });;
        }

        if (userId != req.userId) {
            return res.status(403).send({ status: false, message: "Your are not authorize to create this book with this userId ⚠️" });;
        }

        if (!validate.isValid(title)) {
            return res.status(400).send({ status: false, message: "Title must be present ⚠️" })
        }
        const checkTitle = await booksModel.findOne({ title: title })
        if (checkTitle) {
            return res.status(400).send({ status: false, message: "Please provide another title, this title has been used ⚠️" })
        }

        if (!validate.isValid(excerpt)) {
            return res.status(400).send({ status: false, message: "excerpt must be present ⚠️" })
        }

        if (!validate.isValid(ISBN)) {
            return res.status(400).send({ status: false, message: "ISBN must be present ⚠️" })
        }

        if (ISBN.trim().length !== 13 || !Number(ISBN))
            return res.status(400).send({ status: false, message: "ISBN must contain 13 digits" });

        const checkIsbn = await booksModel.findOne({ ISBN: ISBN });
        if (checkIsbn) {
            return res.status(404).send({ status: false, message: "Please provide another isbn, this isbn has been used ⚠️" })
        }

        if (!validate.isValid(category)) {
            return res.status(400).send({ status: false, message: "category must be present ⚠️" })
        }

        if (!validate.isValid(subcategory)) {
            return res.status(400).send({ status: false, message: "subcategory must be present ⚠️" })
        }

        if (!validate.isValid(releasedAt)) {
            return res.status(400).send({ status: false, message: "releasedAt must be present ⚠️" })
        }

        if (!validate.validateDate(releasedAt)) {
            return res.status(400).send({ status: false, message: "Invalid date format, Please provide date as 'YYYY-MM-DD' ⚠️" })
        };

        let files= req.files
        if(files && files.length>0){
            //upload to s3 and get the uploaded link
            // res.send the link back to frontend/postman
            let uploadedFileURL= await uploadFile( files[0] )
            data.bookCover = uploadedFileURL
        }
        else{
            res.status(400).send({ msg: "No file found" })
        }

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(404).send({ status: false, message: "User does not exists ⚠️" })
        }

        const newBook = await booksModel.create(data);
        return res.status(201).send({ status: true, message: "Book created successfully ✅", data: newBook })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

//--------------------------------------------------------------------//

const getBooks = async function (req, res) {
    try {
        let filter = { isDeleted: false }
        if (req.query.userId) {

            if (!(validate.isValid(req.query.userId) && validate.isValidObjectId(req.query.userId))) {
                return res.status(400).send({ status: false, msg: "userId is not valid ⚠️" })
            }
            filter["userId"] = req.query.userId
        }
        if (req.query.category) {

            if (!validate.isValid(req.query.category)) {
                return res.status(400).send({ status: false, message: "Book category is not valid ⚠️" })
            }
            filter["category"] = req.query.category
        }
        if (req.query.subcategory) {

            if (!validate.isValid(req.query.subcategory)) {
                return res.status(400).send({ status: false, message: "Book subcategory is not valid ⚠️" })

            }
            filter["subcategory"] = req.query.subcategory
        }
        let book = await booksModel.find(filter).select({ title: 1, excerpt: 1, userId: 1, category: 1, releasedAt: 1, reviews: 1 }).sort({ title: 1 })

        if (book.length > 0) {
            return res.status(200).send({ status: true, message: "book  list ✅", data: book })

        } else {
            return res.status(404).send({ status: false, message: "no such book found !! ⚠️" })

        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}


//--------------------------------------------------------------------//

const getBookByParams = async function (req, res) {
    try {
        const bookParams = req.params.bookId

        if (!validate.isValidObjectId(bookParams)) {
            return res.status(400).send({ status: false, message: "Inavlid bookId ⚠️" })
        }

        const findBook = await booksModel.findOne({ _id: bookParams, isDeleted: false }).select({ __v: 0 })
        if (!findBook) {
            return res.status(404).send({ status: false, message: `Book does not exist or is already been deleted for this ${bookParams} ⚠️` })
        }

        const reviewData = await reviewModel.find({ bookId: bookParams }).select({ __v: 0, createdAt: 0, updatedAt: 0, isDeleted: 0 })
        let review = findBook.toObject()
        if (reviewData) {
            review["reviewData"] = reviewData
        }
        return res.status(200).send({ status: true, message: "Book found Successfully ✅", data: review })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

//--------------------------------------------------------------------//

const updateBooks = async function(req, res) {
    try {
        let filter = {
            _id: req.params.bookId,
            isDeleted: false,
            userId: req.userId
        }
        let update = {}
        if (!validate.isValidBody(req.body)) {
            return res.status(400).send({ status: false, message: 'body is empty ⚠️' })

        }
        const book = await booksModel.findOne({ _id: req.params.bookId, isDeleted: false })

        if (!book) {
            return res.status(404).send({ status: false, message: `Book not found ⚠️` })
        }

        if (book.userId != req.userId) {
            return res.status(403).send({ status: false, message: "Unauthorized access ⚠️" })
        }
            
        let { title, excerpt, releasedAt, ISBN } = req.body

        if (title) {
            if (!validate.isValid(title)) {
                return res.status(400).send({ status: false, message: 'title is not valid or empty ⚠️' })
            }
            const checkTitle = await booksModel.findOne({ title: title })
            if (checkTitle) {
                return res.status(400).send({ status: false, message: "Please provide another title, this title has been used ⚠️" })
            }
            update['title'] = title
        }
        if (excerpt) {
            if (!validate.isValid(excerpt)) {
                return res.status(400).send({ status: false, message: 'excerpt is not valid ⚠️' })
            }
            update['excerpt'] = excerpt
        }

        if (ISBN) {
            if (!validate.isValid(ISBN)) {
                return res.status(400).send({ status: false, message: 'ISBN is not valid ⚠️' })
            }
            if (ISBN.trim().length !== 13 || !Number(ISBN))
                return res.status(400).send({ status: false, message: "ISBN must contain 13 digits ⚠️" });

            const checkIsbn = await booksModel.findOne({ ISBN: ISBN });
            if (checkIsbn) {
                return res.status(404).send({ status: false, message: "Please provide another isbn, this isbn has been used ⚠️" })
            }
            update['ISBN'] = ISBN
        }
        if (releasedAt) {
            if (!validate.isValid(releasedAt)) {
                return res.status(400).send({ status: false, message: 'releasedAt is not valid value ⚠️' })
            }
            if (!validate.validateDate(releasedAt)) {
                return res.status(400).send({ status: false, message: "Invalid date format, Please provide date as 'YYYY-MM-DD' ⚠️" })
            }
        }

        let updatedBook = await booksModel.findOneAndUpdate(filter, update, { new: true })
        if (updatedBook) {
            return res.status(200).send({ status: true, message: "success ✅", data: updatedBook })

        }

    } catch (err) {
        res.status(500).send({ status: false, error: err.message })
    }

}

//--------------------------------------------------------------------//


const deleteBookById = async function (req, res) {
    try {
        let bookId = req.params.bookId;
        if (bookId) {
            if (!validate.isValidObjectId(bookId)) {
                return res.status(400).send({ status: false, msg: "bookId is not valid please check it ⚠️" })
            }
        }
        let book = await booksModel.findOne({ _id: bookId, isDeleted: false })
        if (!book) {
            return res.status(404).send({ status: false, message: "bookId is not matching with any existing bookId or it is deleted ⚠️" })
        }
        if (book.userId != req.userId) {
            return res.status(403).send({ status: false, message: "Unauthorized access ⚠️" })
        }
        let deleted = await booksModel.findOneAndUpdate({ _id: bookId, isDeleted: false }, { $set: { isDeleted: true, deletedAt: Date.now() } })
        if (deleted) {
            return res.status(200).send({ status: true, message: "book deleted succesfully ✅" })
        }
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}
//--------------------------------------------------------------------//

module.exports = { bookCreation, getBooks, getBookByParams, updateBooks, deleteBookById }

//--------------------------------------------------------------------//