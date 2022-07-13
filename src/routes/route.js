const express = require('express');
const router = express.Router();
const userController = require("../controller/userController")
const bookController = require("../controller/bookController")
const reviewController = require("../controller/reviewController")
const middleware = require("../middleware/auth")



//----------------------------USER-------------------------------------//

router.post("/register", userController.registerUser)
router.post("/login", userController.loginUser)

//--------------------------BOOKS---------------------------------------//

router.post("/books", middleware.tokenChecker, bookController.bookCreation)
router.get("/books", middleware.tokenChecker, bookController.getBooks)
router.get("/books/:bookId", middleware.tokenChecker, bookController.getBookByParams)
router.put("/books/:bookId", middleware.tokenChecker, bookController.updateBooks)
router.delete("/books/:bookId", middleware.tokenChecker, bookController.deleteBookById)

//-----------------------REVIEW-----------------------------------------//

router.post("/books/:bookId/review", reviewController.createReview)
router.put("/books/:bookId/review/:reviewId", reviewController.updatedReview)
router.delete("/books/:bookId/review/:reviewId", reviewController.deleteReview)

//--------------------------------------------------------------------//

module.exports = router;

//--------------------------------------------------------------------//