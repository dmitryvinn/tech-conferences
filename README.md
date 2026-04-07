# Tech Conferences

A curated, community-maintained list of **279 tech conferences** where developer advocates, DevRel professionals, and technical speakers should be submitting talks. This dataset powers the [DevRel Academy CFP Tracker](https://devrelacademy.com/cfp-tracker).

## What's Inside

The `conferences.json` file contains structured data for each conference including:

- **Event details**: name, description, website, location, dates
- **CFP information**: submission URL, open/close dates
- **Format**: in-person, virtual, or hybrid
- **Audience types**: DevRel, open source, AI/ML, cloud, security, frontend, backend, mobile, data, and more
- **Talk formats**: talks, lightning talks, workshops, panels, keynotes, unconferences
- **Speaker perks**: travel, hotel, stipend, speaker dinner, etc.
- **Estimated attendance** and editorial notes

## Conference Categories

| Category | Count | Examples |
|----------|-------|---------|
| Open Source | 45+ | All Things Open, FOSDEM, Open Source Summit |
| AI & Machine Learning | 35+ | NeurIPS, ICML, AI Engineer Summit |
| Cloud & Infrastructure | 30+ | KubeCon, AWS re:Invent, HashiConf |
| General Tech | 50+ | SXSW, Web Summit, Strange Loop |
| Security | 15+ | DEF CON, Black Hat, BSides |
| Frontend & Web | 20+ | React Conf, CSS Day, JSConf |
| Backend & APIs | 15+ | GopherCon, RustConf, PyCon |
| Community | 20+ | DjangoCon, PyCon, RubyConf |
| DevRel & Advocacy | 10+ | DevRelCon, DevRel Summit |
| Data & Analytics | 10+ | Data Council, dbt Coalesce |

## Data Schema

Each conference entry follows this structure:

```json
{
  "id": "conf-example",
  "name": "Example Conference",
  "description": "A brief description of the conference.",
  "url": "https://example.com",
  "cfpUrl": "https://example.com/cfp",
  "location": "City, State/Country",
  "region": "north-america",
  "format": "in-person",
  "audienceTypes": ["general-tech", "open-source"],
  "talkFormats": ["talk", "lightning", "workshop"],
  "eventStartDate": "2026-10-15",
  "eventEndDate": "2026-10-17",
  "cfpOpenDate": "2026-01-01",
  "cfpCloseDate": "2026-06-30",
  "speakerPerks": ["travel", "hotel"],
  "estimatedAttendees": "1000-2000",
  "tags": ["open-source", "community"],
  "featured": false,
  "notes": "First-time speakers encouraged."
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (format: `conf-kebab-case-name`) |
| `name` | string | Yes | Conference name |
| `description` | string | Yes | Brief description |
| `url` | string | Yes | Conference website |
| `cfpUrl` | string | No | Direct link to CFP submission page |
| `location` | string | Yes | City, State/Country |
| `region` | enum | Yes | `north-america`, `europe`, `asia-pacific`, `latin-america`, `africa`, `online` |
| `format` | enum | Yes | `in-person`, `virtual`, `hybrid` |
| `audienceTypes` | array | Yes | Target audiences (see values below) |
| `talkFormats` | array | Yes | Accepted talk formats |
| `eventStartDate` | string | No | ISO date (YYYY-MM-DD) |
| `eventEndDate` | string | No | ISO date (YYYY-MM-DD) |
| `cfpOpenDate` | string | No | ISO date (YYYY-MM-DD) |
| `cfpCloseDate` | string | No | ISO date (YYYY-MM-DD) |
| `speakerPerks` | array | No | e.g., `travel`, `hotel`, `stipend`, `speaker-dinner` |
| `estimatedAttendees` | string | No | Range, e.g., `500-1000` |
| `tags` | array | No | Freeform topic tags |
| `featured` | boolean | No | Highlighted conference |
| `notes` | string | No | Editorial notes |

### Audience Types

`devrel`, `developer-experience`, `dx`, `community`, `open-source`, `developer-marketing`, `platform-engineering`, `general-tech`, `ai-ml`, `cloud`, `security`, `frontend`, `backend`, `mobile`, `data`

### Talk Formats

`talk`, `lightning`, `workshop`, `panel`, `keynote`, `unconference`

### Regions

`north-america`, `europe`, `asia-pacific`, `latin-america`, `africa`, `online`

## Contributing

We welcome contributions from the community. Here's how you can help:

### Adding a New Conference

1. Fork this repository
2. Add your conference to `conferences.json` following the schema above
3. Ensure all required fields are filled in
4. Submit a pull request

### Updating Existing Data

If you notice outdated CFP dates, broken URLs, or incorrect information:

1. Open an issue describing what needs to be updated, or
2. Submit a pull request with the correction

### Guidelines

- Only include conferences that accept talk submissions (have a CFP process)
- Verify all URLs are working before submitting
- Use ISO date format (YYYY-MM-DD) for all dates
- Include at least one audience type and one talk format
- Keep descriptions concise (1-2 sentences)

## Usage

This data is available as a JSON file that can be consumed by any application. It is used by [DevRel Academy](https://devrelacademy.com) to power the [CFP Tracker](https://devrelacademy.com/cfp-tracker).

```javascript
// Example: Load and filter conferences with open CFPs
const conferences = require('./conferences.json');
const today = new Date().toISOString().split('T')[0];

const openCfps = conferences.filter(conf =>
  conf.cfpCloseDate && conf.cfpCloseDate >= today
);

console.log(`${openCfps.length} conferences with open CFPs`);
```

## License

This data is provided under the [MIT License](LICENSE). Conference information is sourced from publicly available websites and community contributions.

## Acknowledgments

This project is maintained as part of [DevRel Academy](https://devrelacademy.com), a learning platform for developer advocates. Originally based on the [awesome-dev-advocacy](https://github.com/dmitryvinn/awesome-dev-advocacy) project.
