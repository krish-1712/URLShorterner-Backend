var express = require('express');
var router = express.Router();
const { userModel } = require('../schemas/userschema')
const mongoose = require('mongoose')
const { dbUrl } = require('../common/dbConfig')
const { hashPassword, hashCompare, createToken, validate } = require('../common/auth')
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken');
const { urlModel } = require('../schemas/urlschema')
const shortid = require('shortid');
const validUrl = require('valid-url');



mongoose.connect(dbUrl)

/* GET users listing. */
router.get('/dummy', validate, async function (req, res) {
  try {
    let users = await userModel.find({});
    console.log(users);
    return res.status(200).send({
      users,
      message: 'Users Data Fetch Successfully!'
    })

  } catch (error) {
    res.status(500).send({
      message: 'Internal Server Error',
      error
    })
    console.log(error);
  }

});

router.get('/:id', async (req, res) => {
  try {
    let user = await userModel.findOne({ _id: req.params.id });
    res.status(200).send({
      user,
      message: 'Users Data Fetch Successfully!'
    })

  } catch (error) {
    res.status(500).send({
      message: 'Internal Server Error',
      error
    })
  }

});

router.post('/signup', async (req, res) => {
  try {
    let user = await userModel.findOne({
      email: req.body.email
    })
    console.log(user)

    if (!user) {
      console.log("inside")
      let hashedPassword = await hashPassword(req.body.password)
      req.body.password = hashedPassword
      let user = await userModel.create(req.body)

      const token = jwt.sign({ userId: user._id, active: false }, process.env.secretkey, { expiresIn: '1h' });

      let transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD

        },
      });
      const queryParams = new URLSearchParams();
      queryParams.set('token', token);
      const queryString = queryParams.toString();
      console.log(queryString)


      function generateUniqueIdentifier() {
        return shortid.generate();
      }


      const uniqueId = generateUniqueIdentifier();
      console.log(uniqueId);


      const newShortURL = new urlModel({
        originalURL: `${process.env.CLIENT_URL}/password-reset?${queryString}`,
        shortenedURL: uniqueId,
      });
      const savedURL = await newShortURL.save();
      console.log('Short URL saved:', savedURL);

      const resetPasswordURL = `${process.env.CLIENT_URL}/active?short=${savedURL.shortenedURL}`;

      let details = {
        from: "greenpalace1712@gmail.com",
        to: "krishkannan1712@gmail.com",
        subject: "Hello ✔",
        html: `
          <p>Hello,</p>
          <p>Please click on the following link to Activate your Page:</p>
          <a href="${resetPasswordURL}">Activation Link</a>
          <p>If you didn't request this, please ignore this email.</p>
        `
      };
      await transporter.sendMail(details)

      res.status(200).send({
        message: "User Signup Successfully! and Activation Mail sent",
        user,
      })
    }
    else {
      res.status(400).send({
        message: 'Users Already Exists!'
      })
    }

  } catch (error) {
    res.status(500).send({
      message: 'Internal Server Error',
      error
    })
  }
})

router.post('/login', async (req, res) => {
  try {
    console.log("rtetss")
    let user = await userModel.findOne({ email: req.body.email })
    console.log(user)
    if (user) {

      // verify the password
      if (await hashCompare(req.body.password, user.password)) {
        // create the Token
        let token = await createToken({
          name: user.name,
          email: user.email,
          id: user._id,
          role: user.role
        })
        res.status(200).send({
          message: "User Login Successfully!",
          token
        })
      }
      else {
        res.status(402).send({
          message: "Invalid Credentials"
        })
      }

    }
    else {
      res.status(400).send({
        message: 'Users Does Not Exists!'
      })
    }

  } catch (error) {
    res.status(500).send({
      message: 'Internal Server Error',
      error
    })
  }
})


router.put('/:id', async (req, res) => {
  try {
    let user = await userModel.findOne({ _id: req.params.id })
    if (user) {
      user.name = req.body.name
      user.email = req.body.email
      user.password = req.body.password

      await user.save()

      res.status(200).send({
        message: "User Updated Successfully!"
      })
    }
    else {
      res.status(400).send({
        message: 'Users Does Not Exists!'
      })
    }



  } catch (error) {
    res.status(500).send({
      message: 'Internal Server Error',
      error
    })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    let user = await userModel.findOne({ _id: req.params.id })
    if (user) {
      let user = await userModel.deleteOne({ _id: req.params.id })
      res.status(200).send({
        message: "User Deleted Successfull!",
        user
      })
    }
    else {
      res.status(400).send({
        message: 'Users Does Not Exists!'
      })
    }

  } catch (error) {
    res.status(500).send({
      message: 'Internal Server Error',
      error
    })
  }
})




router.post("/url", async (req, res) => {
  console.log("id : " + req.body.id);
  if (req.body.id) {
    let url = await urlModel.findOne({ shortenedURL: req.body.id })
    if (url) {
      return res.status(200).send({ originalURL: url.originalURL })
    } else {
      return res.status(404).send({ message: 'URL not found' });
    }
  }
  return res.status(404).send({ message: 'URL not found' });
});


router.post("/reset", async (req, res) => {
  console.log(req.body.values.email);

  try {
    let user = await userModel.findOne({ email: req.body.values.email })
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }


    const token = jwt.sign({ userId: user.email }, process.env.secretkey, { expiresIn: '1h' });
    let transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD

      },
    });



    const queryParams = new URLSearchParams();
    queryParams.set('token', token);
    const queryString = queryParams.toString();

    function generateUniqueIdentifier() {
      return shortid.generate();
    }


    const uniqueId = generateUniqueIdentifier();
    console.log(uniqueId);


    const newShortURL = new urlModel({
      originalURL: `/password?${queryString}`,
      shortenedURL: uniqueId,
    });
    const savedURL = await newShortURL.save();
    console.log('Short URL saved:', savedURL);

    const resetPasswordURL = `${process.env.CLIENT_URL}/url?id=${savedURL.shortenedURL}`;
    let details = {
      from: "greenpalace1712@gmail.com",
      to: "krishkannan1712@gmail.com",
      subject: "Hello ✔",
      html: `
        <p>Hello,</p>
        <p>Please click on the following link to reset your password:</p>
        <a href="${resetPasswordURL}">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };
    await transporter.sendMail(details)
    res.status(200).send({ message: 'Password reset email sent' })
    console.log(details)


  }

  catch (error) {
    console.error('Error saving short URL or sending email:', error);
    res.status(500).send({
      message: 'Error saving short URL or sending email',
      error,
    });
  }


});


router.post('/password-reset', async (req, res) => {


  try {
    const users = await userModel.findOne({ email: req.body.email });
    console.log("reset : " + req.body.password);
    const token = req.body.token;
    console.log(token)
    let hashedPassword = await hashPassword(req.body.password)
    console.log(hashedPassword);

    let decodedToken = jwt.verify(token, process.env.secretkey)

    console.log("decoded : " + decodedToken)
    const userId = decodedToken.userId;
    console.log(userId)
    const filter = { email: userId };
    const update = { password: hashedPassword };

    const doc = await userModel.findByIdAndUpdate(filter, update);
    console.log("test");
    console.log(doc);


    res.status(200).send({
      message: "Password Reset successfully",
    })

  } catch (error) {
    res.status(400).send({
      message: "Some Error Occured",
    })
  }
})


router.post('/active', async (req, res) => {
  try {
    console.log(req.body)
    const { token } = req.body;
    console.log("token:", token);

    if (!token) {
      return res.status(400).json({ message: 'Token is missing' });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.secretkey);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    const userId = decodedToken.userId;
    console.log("userId:", userId);

    const filter = { email: userId };
    const update = { active: true };

    const doc = await userModel.findOneAndUpdate(filter, update);
    console.log("doc:", doc);

    return res.status(200).json({ message: 'Account activated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.get('/:id/urlcounts', async (req, res) => {

  try {

    const token = req.headers['authorization'].split(" ")[1];
    console.log('Token:', token);

    const decodedToken = jwt.verify(token, process.env.secretkey);
    if (!decodedToken) {
      return res.status(401).send({ message: 'Unauthorized' });
    }
    const today = new Date();
    console.log('Today:', today);
    const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);

    console.log('Thirty Days Ago:', thirtyDaysAgo);


    const urlCountsByDay = await urlModel.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },


        },

      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          originalURL: { $first: '$originalURL' },
          shortenedURL: { $first: '$shortenedURL' },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          originalURL: 1,
          shortenedURL: 1,
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    console.log('URL Counts By Day:', urlCountsByDay);

    const urlCountsByMonth = await urlModel.aggregate([


      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          originalURL: { $first: '$originalURL' },
          shortenedURL: { $first: '$shortenedURL' },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          originalURL: 1,
          shortenedURL: 1,
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    console.log('URL Counts By Month:', urlCountsByMonth);


    return res.status(200).json({ urlCountsByDay, urlCountsByMonth });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.post('/shorten', async (req, res) => {
  const { originalURL } = req.body;

  // Validate the original URL
  if (!validUrl.isUri(originalURL)) {
    return res.status(400).json({ message: 'Invalid original URL' });
  }

  try {
    // Check if the original URL already exists in the database
    const existingURL = await urlModel.findOne({ originalURL });
    if (existingURL) {
      return res.json({ shortenedURL: existingURL.shortenedURL });
    }

    // Generate a unique shortened URL
    const shortenedURL = shortid.generate();

    // Create a new URL document in the database
    const newURL = new urlModel({
      originalURL,
      shortenedURL,
    });
    await newURL.save();

    // Return the shortened URL
    res.json({ shortenedURL });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});







module.exports = router;
