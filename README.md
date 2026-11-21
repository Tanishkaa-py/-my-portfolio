# Tanishka Jain Portfolio

Personal portfolio of Tanishka Jain: data scientist, AI engineer and full-stack developer from Jaipur, India.

Plain HTML, CSS and JavaScript. No build step and no framework. Smooth scrolling comes from [Lenis](https://github.com/darkroomengineering/lenis) loaded from a CDN.

## Run locally

```bash
# any static server works
npx serve .
# or
python3 -m http.server 8080
```

Then open http://localhost:8080 (or the port `serve` prints).

## Deploy (free)

**Vercel:** push this folder to a GitHub repo, then import it at vercel.com/new. Framework preset: "Other". No build command. Output directory: `.`

**Netlify:** drag the folder onto app.netlify.com/drop, or connect the repo with no build command.

Then add a custom domain (for example `tanishkajain.dev`) in the host's domain settings.

## Structure

```
index.html        all page content and section markup
css/style.css     design tokens at the top, then one block per section
js/main.js        every interaction, one block per feature, plus the
                  project, skill, certification and repo data
assets/           tanishka.webp (the only photo), og.jpg (link preview)
```

## Editing content

- **Projects:** the `P` array in `js/main.js`. Each project has a plain-English `line` for the card and full details for the pop-up.
- **Certifications:** the `C` array. Set `f: true` to make one a dark "featured" card.
- **GitHub repos:** the `R` array.
- **Timeline:** the `<ol id="storyList">` in `index.html`. Each `<li>` needs `data-year` and `data-range`.
- **Flip-calendar roles:** the `words` array in the flip calendar block.
