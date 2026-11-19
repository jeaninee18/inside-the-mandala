# Obsidian Vault

The single home for all working projects. Open this folder in Obsidian as a vault, or browse it on GitHub.

Each project lives in its own folder under `Projects/`. Each folder has a `README.md` that says what the project is, where it is deployed, and what is next.

## Projects

| Project | Stream | Status | Folder |
|---|---|---|---|
| Inside the Mandala | The Mindful Mandala Wellness | Live, event Jan 17 2027 | [[Projects/inside-the-mandala/README\|inside-the-mandala]] |
| Nightsky Sessions | The Mindful Mandala Wellness | Live | [[Projects/nightsky-sessions/README\|nightsky-sessions]] |
| Lakelife Property Management | Web design (client) | Delivered, private repo | [[Projects/lakelife-property-management/README\|lakelife-property-management]] |

## How to add a new project

1. Create a folder under `Projects/` with a short kebab-case name.
2. Add a `README.md` using the template in `Templates/Project.md`.
3. Add a row to the table above.

## Deployment note

The Inside the Mandala Vercel project deploys from this repository root. `vercel.json` rewrites the site root into `Projects/inside-the-mandala`, so no dashboard change is needed. For any other project deployed from this vault, set its Vercel Root Directory to its folder under `Projects/`.
