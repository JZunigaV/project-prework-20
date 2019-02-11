const passport = require("passport");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
//Models
const Profile = require("../Model/Profile");
const User = require("../Model/User");
const ensureLogin = require("connect-ensure-login");
const axios = require("axios");

//Test Route
router.get("/profile/test", (req, res) => {
  return res.json({ msg: req.body });
});

// @route   GET  /profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", ensureLogin.ensureLoggedIn(), (req, res) => {
  const user = req.user;
  if (user === undefined) {
    return res.render("auth/login");
  }
  Profile.findOne({ user: req.user._id })
    .populate("user", ["username", "avatarUrl"])
    .then(profile => {
      if (!profile) {
        res.render("profile/newProfile", { user });
        return;
      }

      console.log(profile)
     
      if (profile.githubUsername !== undefined || profile !== null) {
        axios
          .get(
            `https://api.github.com/users/${
              profile.githubUsername
            }/repos?per_page=100`
          )
          .then(response => {
            latestRepos = response.data
              .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
              .slice(0, 3);
            
            res.render("profile/profile", { profile, latestRepos });
            return;
          })
          .catch(error => {
            console.log(error);
          });
      }else{
        res.render("profile/profile", { profile});
        return;
      }
     

    })
    .catch(err => res.status(404).json(err));
});

// @route   GET  /profile/all
// @desc    Get all profiles
// @access  Private
router.get("/profile/all", ensureLogin.ensureLoggedIn(), (req, res) => {
  const user = req.user;
  if (user === undefined) {
    return res.render("auth/login");
  }

  Profile.find()
    .populate("user", ["username", "avatarUrl"])
    .then(profiles => {
      if (!profiles) {
        return res.status(404).json({ msg: "The are no profiles" });
      }
      res.render("profile/classmates", { profiles });
      //res.json(profiles);
    })
    .catch(err => {
      res.status(404).json({ msg: "There are no profiles" });
    });
});

// @route   GET  /profile/handle/:handle
// @desc    Get profile by handle
// @access  Private
router.get(
  "/profile/handle/:handle",
  ensureLogin.ensureLoggedIn(),
  (req, res) => {
    Profile.findOne({ handle: req.params.handle })
      .populate("user", ["username", "avatarUrl"])
      .then(profile => {
        if (!profile) {
          res.status(404).json({ msg: "There is no profile for this user" });
        }
        res.json(profile);
      })
      .catch(err => res.status(404).json(err));
  }
);

// @route   GET  /profile/user/:user_id
// @desc    Get profile by user Id
// @access  Private
router.get(
  "/profile/user/:user_id",
  ensureLogin.ensureLoggedIn(),
  (req, res) => {
    const user = req.user;

    if (user === undefined) {
      return res.render("auth/login");
    }

    Profile.findOne({ user: req.params.user_id })
      .populate("user", ["username", "avatarUrl"])
      .then(profile => {
        profile.skills = profile.skills.join(", ");

        if (!profile) {
          res.status(404).json(errors);
        }
        res.render("profile/editProfile", { profile });
      })
      .catch(err =>
        res.status(404).json({ msg: "There is no profile for this user" })
      );
  }
);

// @route   GET  /profile/user/:user_id
// @desc    Get profile by user Id
// @access  Private
router.get(
  "/profile/user/classmate/:user_id",
  ensureLogin.ensureLoggedIn(),
  (req, res) => {
    const user = req.user;

    if (user === undefined) {
      return res.render("auth/login");
    }

    Profile.findOne({ user: req.params.user_id })
      .populate("user", ["username", "avatarUrl"])
      .then(profile => {
        if (!profile) {
          res.status(404).json(errors);
        }
        res.render("profile/classmateProfile", { profile });
      })
      .catch(err =>
        res.status(404).json({ msg: "There is no profile for this user" })
      );
  }
);

// @route   POST  /profile
// @desc    Create or edit user profile
// @access  Private
router.post("/profile", (req, res) => {
  //Get fields

  const user = req.user;
  if (user === undefined) {
    return res.render("auth/login");
  }

  const profileFields = {};
  profileFields.user = req.user._id;

  if (!req.body.handle) {
    res.status(400).json({ err: "handle is required" });
  }

  if (req.body.handle && /^[A-Za-z0-9_\-]{1,20}/.test(req.body.handle)) profileFields.handle = req.body.handle;
  if (req.body.location && req.body.location.length < 100) profileFields.location = req.body.location;
  if (req.body.bio && req.body.bio.length < 281) profileFields.bio = req.body.bio;
  if (req.body.githubUsername) profileFields.githubUsername = req.body.githubUsername;

  //Skills - split into array ignoring extra spaces and commas
  if (typeof req.body.skills !== "undefined") profileFields.skills = req.body.skills.split(/,+ *[, ]*/).filter(el=>/^[A-Z\-a-z0-9 ]{1,20}$/.test(el));
  

  //Social
  profileFields.social = {};
  if (req.body.youtube && /^(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/)/.test(req.body.youtube)) profileFields.social.youtube = req.body.youtube;
  if (req.body.twitter && /^(https?:\/\/)?(www\.)?twitter\.com\/([a-zA-Z0-9_]+)/.test(req.body.twitter)) profileFields.social.twitter = req.body.twitter;
  if (req.body.facebook && /^(?:http:\/\/)?(?:www\.)?facebook\.com\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:[\w\-]*\/)*([\w\-]*)/.test(req.body.facebook)) profileFields.social.facebook = req.body.facebook;
  if (req.body.linkedin && /^http(s)?:\/\/([\w]+\.)?linkedin\.com\/in\/(A-z 0-9 _ -)\/?/.test(req.body.linkedin)) profileFields.social.linkedin = req.body.linkedin;
  if (req.body.instagram && /^https?:\/\/(www\.)?instagram\.com\/([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/.test(req.body.instagram)) profileFields.social.instagram = req.body.instagram;

  Profile.findOne({ user: req.user._id })
    .then(profile => {
      if (profile) {
        //Update
        Profile.findOneAndUpdate(
          { user: req.user._id },
          { $set: profileFields },
          { new: true }
        )
          .then(profile => {
            res.redirect("profile");
          })
          .catch(err => console.log(err));
      } else {
        //Create

        //Check if handle exists
        Profile.findOne({ handle: profileFields.handle })
          .then(profile => {
            if (profile) {
              res.status(400).json({ error: "That handle already exists" });
            }
            //Save Profile
            new Profile(profileFields).save().then(profile => {
              res.redirect("profile");
            });
          })
          .catch(err => console.log(err));
      }
    })
    .catch(err => console.log(err));
});

//end authentication routes
module.exports = router;
