const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeJobDataLake,
  normalizeAdzuna,
  normalizeJSearch,
} = require("../src/services/jobs/jobNormalizer.services");
const { mergeJobs } = require("../src/services/jobs/jobDeduplicator.services");
const jobDataLake = require("../src/services/jobs/providers/jobDataLake.provider");
const adzuna = require("../src/services/jobs/providers/adzuna.provider");
const jsearch = require("../src/services/jobs/providers/jsearch.provider");

test("normalizes all provider payloads into the common job shape", () => {
  const lake = normalizeJobDataLake({
    id: "lake-1",
    job_handle: "backend-engineer-1",
    title: "Backend Engineer",
    company_name: "Acme",
    locations: ["Bengaluru"],
    countries: ["IN"],
    required_skills: ["Node.js"],
    url: "https://acme.test/jobs/1",
  });
  const adzuna = normalizeAdzuna({
    id: "adz-1",
    title: "Data Engineer",
    company: { display_name: "Data Co" },
    location: { display_name: "London", area: ["UK", "London"] },
    redirect_url: "https://adzuna.test/1",
  });
  const jsearch = normalizeJSearch({
    job_id: "js-1",
    job_title: "Frontend Engineer",
    employer_name: "Web Co",
    job_city: "Paris",
    job_country: "France",
    job_apply_link: "https://web.test/jobs/1",
  });
  for (const job of [lake, adzuna, jsearch]) {
    assert.ok(job.source);
    assert.ok(job.sourceJobId);
    assert.ok(job.title);
    assert.ok(job.company);
    assert.match(job.fingerprint, /^[a-f0-9]{64}$/);
  }
});

test("deduplicates cross-provider jobs and retains source references", () => {
  const first = normalizeJobDataLake({
    id: "lake-1",
    job_handle: "backend-engineer-1",
    title: "Backend Engineer",
    company_name: "Acme",
    locations: ["Bengaluru"],
    countries: ["IN"],
    url: "https://acme.test/jobs/1",
    required_skills: ["Node.js"],
  });
  const second = normalizeJSearch({
    job_id: "js-1",
    job_title: "Backend Engineer",
    employer_name: "Acme",
    job_city: "Bengaluru",
    job_country: "IN",
    job_apply_link: "https://acme.test/opening/2",
    job_required_skills: ["MongoDB"],
  });
  const merged = mergeJobs([first, second]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].sourceReferences.length, 2);
  assert.deepEqual(merged[0].skills.sort(), ["MongoDB", "Node.js"]);
});

test("preserves multiple locations and formats the primary Indian location", () => {
  const job = normalizeJobDataLake({
    id: "lake-2",
    job_handle: "platform-engineer-2",
    title: "Platform Engineer",
    company_name: "Acme",
    locations: ["Bengaluru", "Hyderabad"],
    countries: ["IN"],
    remote_type: "hybrid",
  });
  assert.deepEqual(job.locations, ["Bengaluru", "Hyderabad"]);
  assert.equal(job.location.display, "Bengaluru, India");
  assert.equal(job.remoteType, "hybrid");
});

test("maps nested remote policy and array seniority from JobDataLake details", () => {
  const job = normalizeJobDataLake({
    id: "lake-detail",
    title: "Senior Consultant",
    company_name: "Acme",
    locations: ["Chennai"],
    countries: ["IN"],
    remote_policy: { type: "hybrid" },
    seniority: ["Senior"],
    employment_type: "full_time",
  });
  assert.equal(job.remoteType, "hybrid");
  assert.equal(job.seniority, "Senior");
  assert.equal(job.employmentType, "full_time");
});

test("uses a narrow title rule only when provider seniority is absent", () => {
  assert.equal(
    normalizeJobDataLake({
      id: "senior-title",
      title: "Senior Consultant",
      company_name: "Acme",
    }).seniority,
    "Senior",
  );
  assert.equal(
    normalizeJobDataLake({
      id: "ambiguous-title",
      title: "Experienced Software Engineer",
      company_name: "Acme",
    }).seniority,
    "",
  );
});

test("All India sends a country filter without a city to every provider", () => {
  const params = {
    q: "Software Engineer",
    country: "IN",
    location: "All India",
    page: 1,
    limit: 20,
    sort: "newest",
  };
  const lakeUrl = new URL(jobDataLake.buildSearchUrl(params));
  const adzunaUrl = new URL(adzuna.buildSearchUrl(params));
  const jsearchUrl = new URL(jsearch.buildSearchUrl(params));
  assert.equal(lakeUrl.searchParams.get("countries"), "IN");
  assert.equal(lakeUrl.searchParams.has("location"), false);
  assert.match(adzunaUrl.pathname, /\/jobs\/in\/search\/1$/);
  assert.equal(adzunaUrl.searchParams.has("where"), false);
  assert.equal(jsearchUrl.searchParams.get("country"), "in");
  assert.equal(jsearchUrl.searchParams.get("query"), "Software Engineer");
});

test("city searches remain scoped to the selected country", () => {
  for (const city of ["Bengaluru", "Hyderabad", "Mumbai"]) {
    const params = {
      q: "Software Engineer",
      country: "IN",
      location: city,
      page: 2,
      limit: 20,
      sort: "salary-desc",
    };
    const lakeUrl = new URL(jobDataLake.buildSearchUrl(params));
    assert.equal(lakeUrl.searchParams.get("countries"), "IN");
    assert.equal(lakeUrl.searchParams.get("location"), city);
    assert.equal(lakeUrl.searchParams.get("sort_by"), "salary_max_usd:desc");
    assert.match(
      new URL(jsearch.buildSearchUrl(params)).searchParams.get("query"),
      new RegExp(`in ${city}$`),
    );
  }
});

test("international searches do not inherit India or an Indian city", () => {
  const params = {
    q: "Data Analyst",
    country: "US",
    location: "All locations",
    page: 1,
    limit: 20,
    sort: "salary-asc",
  };
  const lakeUrl = new URL(jobDataLake.buildSearchUrl(params));
  assert.equal(lakeUrl.searchParams.get("countries"), "US");
  assert.equal(lakeUrl.searchParams.has("location"), false);
  assert.equal(lakeUrl.searchParams.get("sort_by"), "salary_min_usd:asc");
  assert.equal(
    new URL(jsearch.buildSearchUrl(params)).searchParams.get("country"),
    "us",
  );
});
