<div align="center">
  <img src="static-cms-logo.png" width="500px" />

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/StaticJsCMS/static-cms/blob/main/LICENSE)
[![Build](https://github.com/StaticJsCMS/static-cms/actions/workflows/build.yml/badge.svg)](https://github.com/StaticJsCMS/static-cms/actions/workflows/build.yml)
[![npm latest package](https://img.shields.io/npm/v/@staticcms/core/latest.svg)](https://www.npmjs.com/package/@staticcms/core)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/StaticJsCMS/static-cms/blob/main/CONTRIBUTING.md)
<div align="center">

[Docs](https://staticcms.org/)
| [Demo](https://demo.staticcms.org/)
| [Issues](https://github.com/StaticJsCMS/static-cms/issues)
| [Discord](https://discord.gg/ZWJM9pBMjj)

</div>
</div>

A CMS for static site generators. Give users a simple way to edit and add content to any site built with a static site generator.

## How It Works

Static CMS is a single-page app that you pull into the `/admin` part of your site.

It presents a clean UI for editing content stored in a Git repository.

You setup a YAML config to describe the content model of your site, and typically tweak the main layout of the CMS a bit to fit your own site.

When a user navigates to `/admin/` they'll be prompted to log in, and once authenticated they'll be able to create new content or edit existing content.

Read more about Static CMS [Core Concepts](https://staticcms.org/docs/intro/).

# Installation and Configuration

The Static CMS can be used in two different ways.

- A Quick and easy install, that requires you to create a single HTML file and a configuration file. All the CMS JavaScript and CSS are loaded from a CDN.
  To learn more about this installation method, refer to the [CDN Hosting Guide](https://staticcms.org/docs/add-to-your-site-cdn/)
- A complete, more complex install, that gives you more flexibility but requires that you use a static site builder with a build system that supports npm packages.
  To learn more about this installation method, refer to the [Bundling Guide](https://staticcms.org/docs/add-to-your-site-bundling/)

# Contributing

New contributors are always welcome! Check out [CONTRIBUTING.md](https://github.com/StaticJsCMS/static-cms/blob/main/CONTRIBUTING.md) to get involved.

# Change Log

This project adheres to [Semantic Versioning](http://semver.org/).
Every release is documented on the Github [Releases](https://github.com/StaticJsCMS/static-cms/releases) page.

# License

Static CMS is released under the [MIT License](LICENSE).
Please make sure you understand its [implications and guarantees](https://writing.kemitchell.com/2016/09/21/MIT-License-Line-by-Line.html).

# Netlify CMS

Static CMS is a fork of Netlify CMS focusing on the core product over adding massive, scope expanding, new features.
