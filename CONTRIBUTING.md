# Contributing to Tech Conferences

Thank you for your interest in contributing to this community-maintained list of tech conferences. Every contribution helps DevRel professionals and technical speakers find their next speaking opportunity.

## How to Contribute

### Adding a New Conference

1. **Fork** this repository
2. **Edit** `conferences.json` and add your conference entry
3. **Verify** all URLs are working and dates are accurate
4. **Submit** a pull request with a brief description

### Conference Entry Template

```json
{
  "id": "conf-your-conference-name",
  "name": "Your Conference Name",
  "description": "A brief 1-2 sentence description of the conference.",
  "url": "https://yourconference.com",
  "cfpUrl": "https://yourconference.com/cfp",
  "location": "City, State/Country",
  "region": "north-america",
  "format": "in-person",
  "audienceTypes": ["general-tech"],
  "talkFormats": ["talk", "lightning"],
  "eventStartDate": "2026-10-15",
  "eventEndDate": "2026-10-17",
  "cfpCloseDate": "2026-06-30",
  "speakerPerks": ["travel", "hotel"],
  "estimatedAttendees": "500-1000",
  "tags": ["your-topic"],
  "notes": "Any helpful notes for potential speakers."
}
```

### Quality Checklist

Before submitting, please verify:

- [ ] Conference has a CFP (Call for Papers) process
- [ ] All URLs are valid and accessible
- [ ] Dates are in ISO format (YYYY-MM-DD)
- [ ] Required fields are filled in (`id`, `name`, `description`, `url`, `location`, `region`, `format`, `audienceTypes`, `talkFormats`)
- [ ] The `id` follows the `conf-kebab-case-name` format
- [ ] The conference is not already in the list (search by name and URL)
- [ ] Description is concise (1-2 sentences)

### Updating Existing Entries

If you notice outdated information:

1. Open an **issue** describing what needs updating, or
2. Submit a **pull request** with the correction

Common updates include:
- New CFP dates for upcoming years
- Updated website URLs
- Changed conference formats (e.g., moved from in-person to hybrid)
- Corrected location or attendance information

### Removing a Conference

If a conference has been permanently discontinued:

1. Open an **issue** with evidence (e.g., official announcement)
2. We will review and remove it from the list

## Code of Conduct

Be respectful and constructive in all interactions. We are building a resource for the community, and every contribution matters.
