// Generated from the Finch marketplace examples doc. Each test is a value
// table row: one value per input and the expected value per output.
import type { ExtensionDefinition } from "./extensionTypes";

export const EXTENSIONS: ExtensionDefinition[] = [
  {
    "id": "1",
    "name": "Normalize Page URLs",
    "description": "Strips the protocol, query string, fragment and trailing slash from URLs and lowercases the host, so the same page always looks the same.",
    "replaces": "A transformation Function.",
    "source": "tealium",
    "publisher": "",
    "category": "Data cleanup",
    "isBulk": true,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "preEvent",
        "label": "Pre-Event"
      },
      {
        "id": "postEvent",
        "label": "Post-Event"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "params": [
      {
        "id": "p1",
        "variableName": "name",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "provided by framework",
        "description": "Attribute name"
      },
      {
        "id": "p2",
        "variableName": "value",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "page_url",
        "description": "The raw URL"
      },
      {
        "id": "p3",
        "variableName": "type",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "provided by framework",
        "description": "Attribute type, always String"
      },
      {
        "id": "p4",
        "variableName": "scope",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "provided by framework",
        "description": "event, visit or visitor"
      },
      {
        "id": "p5",
        "variableName": "value",
        "direction": "output",
        "type": "String",
        "exampleAttribute": "page_url",
        "description": "The normalized URL"
      }
    ],
    "code": "// Paths keep their case, because many servers treat /Mens and /mens\n// as different pages. Only the host is lowercased.\nif (typeof input.value !== \"string\" || input.value.trim() === \"\") return output;\n\nconst url = input.value.trim().split(\"#\")[0].split(\"?\")[0];\nlet host = \"\";\nlet path = url;\n\nconst match = url.match(/^(?:[a-z][a-z0-9+.-]*:)?\\/\\/([^/]*)(.*)$/i);\nif (match) {\n  host = match[1].toLowerCase();\n  path = match[2];\n}\n\npath = path.replace(/\\/+$/, \"\");\noutput.value = host + path || \"/\";",
    "tests": [
      {
        "id": "t1",
        "suite": "Protocol and host",
        "name": "strips https:// and lowercases the host",
        "inputs": {
          "value": "https://Example.com/Page"
        },
        "expected": {
          "value": "example.com/Page"
        }
      },
      {
        "id": "t2",
        "suite": "Protocol and host",
        "name": "strips http://",
        "inputs": {
          "value": "http://example.com/page"
        },
        "expected": {
          "value": "example.com/page"
        }
      },
      {
        "id": "t3",
        "suite": "Protocol and host",
        "name": "handles protocol-relative URLs",
        "inputs": {
          "value": "//CDN.Example.com/img/logo.png"
        },
        "expected": {
          "value": "cdn.example.com/img/logo.png"
        }
      },
      {
        "id": "t4",
        "suite": "Query and fragment",
        "name": "removes query parameters",
        "inputs": {
          "value": "https://example.com/page?utm_source=mail&id=1"
        },
        "expected": {
          "value": "example.com/page"
        }
      },
      {
        "id": "t5",
        "suite": "Query and fragment",
        "name": "removes the fragment",
        "inputs": {
          "value": "https://example.com/page#reviews"
        },
        "expected": {
          "value": "example.com/page"
        }
      },
      {
        "id": "t6",
        "suite": "Paths",
        "name": "keeps the case of the path",
        "inputs": {
          "value": "https://example.com/Mens/Shoes"
        },
        "expected": {
          "value": "example.com/Mens/Shoes"
        }
      },
      {
        "id": "t7",
        "suite": "Paths",
        "name": "drops a trailing slash",
        "inputs": {
          "value": "https://example.com/mens/"
        },
        "expected": {
          "value": "example.com/mens"
        }
      },
      {
        "id": "t8",
        "suite": "Paths",
        "name": "turns the home page into the bare host",
        "inputs": {
          "value": "https://www.example.com/"
        },
        "expected": {
          "value": "www.example.com"
        }
      },
      {
        "id": "t9",
        "suite": "Edge cases",
        "name": "leaves empty values unchanged",
        "inputs": {
          "value": "\"   \""
        },
        "expected": {}
      },
      {
        "id": "t10",
        "suite": "Edge cases",
        "name": "leaves non-string values unchanged",
        "inputs": {},
        "expected": {}
      }
    ]
  },
  {
    "id": "11",
    "name": "Trim and Lowercase Strings",
    "description": "Trims, collapses repeated spaces and lowercases every string attribute in the scopes you pick.",
    "replaces": "A Lowercase String enrichment on each attribute, one at a time.",
    "source": "tealium",
    "publisher": "",
    "category": "Data cleanup",
    "isBulk": true,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "preEvent",
        "label": "Pre-Event"
      },
      {
        "id": "postEvent",
        "label": "Post-Event"
      },
      {
        "id": "preVisitor",
        "label": "Pre-Visitor"
      },
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      },
      {
        "id": "postAudience",
        "label": "Post-Audience"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "params": [
      {
        "id": "p1",
        "variableName": "name",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "provided by framework",
        "description": "Attribute name"
      },
      {
        "id": "p2",
        "variableName": "value",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "loyalty_tier",
        "description": "String to clean up"
      },
      {
        "id": "p3",
        "variableName": "type",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "provided by framework",
        "description": "Attribute type, always String"
      },
      {
        "id": "p4",
        "variableName": "scope",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "provided by framework",
        "description": "event, visit or visitor"
      },
      {
        "id": "p5",
        "variableName": "value",
        "direction": "output",
        "type": "String",
        "exampleAttribute": "loyalty_tier",
        "description": "Trimmed, single-spaced, lowercased string"
      }
    ],
    "code": "if (typeof input.value !== \"string\") return output;\noutput.value = input.value.trim().replace(/\\s+/g, \" \").toLowerCase();",
    "tests": [
      {
        "id": "t1",
        "suite": "Cleanup",
        "name": "lowercases the value",
        "inputs": {
          "value": "Hello World"
        },
        "expected": {
          "value": "hello world"
        }
      },
      {
        "id": "t2",
        "suite": "Cleanup",
        "name": "trims leading and trailing spaces",
        "inputs": {
          "value": "\"  hello  \""
        },
        "expected": {
          "value": "hello"
        }
      },
      {
        "id": "t3",
        "suite": "Cleanup",
        "name": "collapses repeated spaces",
        "inputs": {
          "value": "\"New   York\""
        },
        "expected": {
          "value": "new york"
        }
      },
      {
        "id": "t4",
        "suite": "Cleanup",
        "name": "treats tabs as spaces",
        "inputs": {
          "value": "\"Gold\\tTier \""
        },
        "expected": {
          "value": "gold tier"
        }
      },
      {
        "id": "t5",
        "suite": "Edge cases",
        "name": "turns a whitespace-only value into an empty string",
        "inputs": {
          "value": "\"   \""
        },
        "expected": {
          "value": "\"\""
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "leaves null alone",
        "inputs": {},
        "expected": {}
      }
    ]
  },
  {
    "id": "10",
    "name": "Tally Over Time",
    "description": "Adds up a tally over a rolling window, such as the product categories a visitor viewed in the last 30 days. Point two instances at the same timeline to get 30 and 60 days.",
    "replaces": "About 5 attributes and 5 coordinated enrichments for one window, and most of that again for each extra window.",
    "source": "tealium",
    "publisher": "",
    "category": "Time and dates",
    "isBulk": false,
    "mvp": true,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "params": [
      {
        "id": "p1",
        "variableName": "timeline",
        "direction": "input",
        "type": "Timeline",
        "exampleAttribute": "product_category_timeline",
        "description": "One entry per visit, { timestamp, tally }"
      },
      {
        "id": "p2",
        "variableName": "visitTally",
        "direction": "input",
        "type": "Tally",
        "exampleAttribute": "visit_product_categories",
        "description": "This visit's counts"
      },
      {
        "id": "p3",
        "variableName": "windowDays",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "30",
        "description": "Rolling window in days"
      },
      {
        "id": "p4",
        "variableName": "eventTime",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "provided by framework",
        "description": "When this event happened"
      },
      {
        "id": "p5",
        "variableName": "masterTally",
        "direction": "output",
        "type": "Tally",
        "exampleAttribute": "product_category_tally_30_days",
        "description": "Counts across the window. The tally's favorite is generated as usual."
      }
    ],
    "code": "const DAY = 86400000;\nconst cutoff = input.eventTime - input.windowDays * DAY;\nconst masterTally = {};\n\nconst add = (tally) => {\n  for (const [key, count] of Object.entries(tally || {})) {\n    if (typeof count !== \"number\" || !Number.isFinite(count)) continue;\n    masterTally[key] = (masterTally[key] || 0) + count;\n  }\n};\n\nfor (const entry of input.timeline || []) {\n  if (entry.timestamp >= cutoff) add(entry.tally);\n}\nadd(input.visitTally);\n\noutput.masterTally = masterTally;",
    "tests": [
      {
        "id": "t1",
        "suite": "Rolling window",
        "name": "includes entries within the window",
        "inputs": {
          "timeline": "[{\"timestamp\":1794052800000,\"tally\":{\"shoes\":3,\"hats\":1}},{\"timestamp\":1793793600000,\"tally\":{\"shoes\":1,\"jackets\":2}}]",
          "visitTally": "{\"shoes\":1}",
          "windowDays": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "masterTally": "{\"shoes\":5,\"hats\":1,\"jackets\":2}"
        }
      },
      {
        "id": "t2",
        "suite": "Rolling window",
        "name": "excludes entries outside the window",
        "inputs": {
          "timeline": "[{\"timestamp\":1794052800000,\"tally\":{\"shoes\":3}},{\"timestamp\":1792929600000,\"tally\":{\"hats\":100}}]",
          "visitTally": "{}",
          "windowDays": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "masterTally": "{\"shoes\":3}"
        }
      },
      {
        "id": "t3",
        "suite": "Rolling window",
        "name": "counts an entry exactly at the edge of the window",
        "inputs": {
          "timeline": "[{\"timestamp\":1793361600000,\"tally\":{\"hats\":2}}]",
          "visitTally": "{}",
          "windowDays": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "masterTally": "{\"hats\":2}"
        }
      },
      {
        "id": "t4",
        "suite": "Visit tally",
        "name": "merges the current visit into the window",
        "inputs": {
          "timeline": "[{\"timestamp\":1794139200000,\"tally\":{\"electronics\":2}}]",
          "visitTally": "{\"electronics\":3,\"books\":1}",
          "windowDays": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "masterTally": "{\"electronics\":5,\"books\":1}"
        }
      },
      {
        "id": "t5",
        "suite": "Visit tally",
        "name": "works on a first visit with an empty timeline",
        "inputs": {
          "timeline": "[]",
          "visitTally": "{\"shoes\":2,\"hats\":5}",
          "windowDays": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "masterTally": "{\"shoes\":2,\"hats\":5}"
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "returns an empty tally when there is no data",
        "inputs": {
          "windowDays": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "masterTally": "{}"
        }
      },
      {
        "id": "t7",
        "suite": "Edge cases",
        "name": "skips counts that aren't numbers",
        "inputs": {
          "timeline": "[{\"timestamp\":1794225600000,\"tally\":{\"shoes\":\"3\",\"hats\":1}}]",
          "visitTally": "{}",
          "windowDays": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "masterTally": "{\"hats\":1}"
        }
      }
    ]
  },
  {
    "id": "8",
    "name": "Recency Frequency Scorer",
    "description": "Scores a visitor from 0 to 100 on how recently and how often they did something, and reports the days since they last did it.",
    "replaces": "A date difference, counters and threshold flags spread across several attributes.",
    "source": "community",
    "publisher": "Lifecycle Lab",
    "category": "Scoring",
    "isBulk": false,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "params": [
      {
        "id": "p1",
        "variableName": "lastDate",
        "direction": "input",
        "type": "Date",
        "exampleAttribute": "last_purchase_date",
        "description": "When the visitor last did it"
      },
      {
        "id": "p2",
        "variableName": "count",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "purchases_last_30_days",
        "description": "How many times in the window"
      },
      {
        "id": "p3",
        "variableName": "windowDays",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "30",
        "description": "Recency window in days"
      },
      {
        "id": "p4",
        "variableName": "targetCount",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "10",
        "description": "Count that earns full frequency credit"
      },
      {
        "id": "p5",
        "variableName": "eventTime",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "provided by framework",
        "description": "When this event happened"
      },
      {
        "id": "p6",
        "variableName": "rfScore",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "rf_score",
        "description": "0 to 100, 60% recency and 40% frequency"
      },
      {
        "id": "p7",
        "variableName": "daysSinceLast",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "days_since_last_purchase",
        "description": "Whole days since lastDate"
      }
    ],
    "code": "const DAY = 86400000;\nconst windowDays = input.windowDays > 0 ? input.windowDays : 30;\nconst target = input.targetCount > 0 ? input.targetCount : 10;\nconst count = Number.isFinite(input.count) ? Math.max(0, input.count) : 0;\n\nlet recency = 0;\nif (Number.isFinite(input.lastDate)) {\n  // A last date in the future (clock skew) counts as today\n  const daysSince = Math.max(0, (input.eventTime - input.lastDate) / DAY);\n  output.daysSinceLast = Math.floor(daysSince);\n  recency = Math.max(0, 1 - daysSince / windowDays);\n}\n\nconst frequency = Math.min(count / target, 1);\noutput.rfScore = Math.round((recency * 0.6 + frequency * 0.4) * 100);",
    "tests": [
      {
        "id": "t1",
        "suite": "Score",
        "name": "gives a recent, frequent visitor 100",
        "inputs": {
          "lastDate": "2026-11-09T12:00:00.000Z",
          "count": "10",
          "windowDays": "30",
          "targetCount": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "rfScore": "100",
          "daysSinceLast": "0"
        }
      },
      {
        "id": "t2",
        "suite": "Score",
        "name": "gives half credit halfway through the window",
        "inputs": {
          "lastDate": "2026-10-25T12:00:00.000Z",
          "count": "5",
          "windowDays": "30",
          "targetCount": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "rfScore": "50",
          "daysSinceLast": "15"
        }
      },
      {
        "id": "t3",
        "suite": "Score",
        "name": "gives no recency credit outside the window",
        "inputs": {
          "lastDate": "2026-09-25T12:00:00.000Z",
          "count": "10",
          "windowDays": "30",
          "targetCount": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "rfScore": "40",
          "daysSinceLast": "45"
        }
      },
      {
        "id": "t4",
        "suite": "Days since",
        "name": "reports whole days since the last date",
        "inputs": {
          "lastDate": "2026-11-07T00:00:00.000Z",
          "count": "1",
          "windowDays": "30",
          "eventTime": "1794225600000"
        },
        "expected": {
          "rfScore": "59",
          "daysSinceLast": "2"
        }
      },
      {
        "id": "t5",
        "suite": "Edge cases",
        "name": "scores frequency only when there is no last date",
        "inputs": {
          "count": "5",
          "windowDays": "30",
          "targetCount": "10",
          "eventTime": "1794225600000"
        },
        "expected": {
          "rfScore": "20"
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "treats a missing count as zero",
        "inputs": {
          "lastDate": "2026-11-09T12:00:00.000Z",
          "windowDays": "30",
          "eventTime": "1794225600000"
        },
        "expected": {
          "rfScore": "60",
          "daysSinceLast": "0"
        }
      },
      {
        "id": "t7",
        "suite": "Edge cases",
        "name": "treats a last date in the future as today",
        "inputs": {
          "lastDate": "2026-11-09T13:00:00.000Z",
          "count": "0",
          "windowDays": "30",
          "eventTime": "1794225600000"
        },
        "expected": {
          "rfScore": "60",
          "daysSinceLast": "0"
        }
      }
    ]
  },
  {
    "id": "2",
    "name": "Compute Engagement Score",
    "description": "Derives an engagement score from page views and purchases.",
    "replaces": "One intermediate attribute per arithmetic step, since number enrichments take two values at a time.",
    "source": "team",
    "publisher": "",
    "category": "Scoring",
    "isBulk": false,
    "mvp": true,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      },
      {
        "id": "postAudience",
        "label": "Post-Audience"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "params": [
      {
        "id": "p1",
        "variableName": "viewCount",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "page_view_count",
        "description": "Lifetime page views"
      },
      {
        "id": "p2",
        "variableName": "purchaseCount",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "purchase_count",
        "description": "Lifetime purchases"
      },
      {
        "id": "p3",
        "variableName": "score",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "engagement_score",
        "description": "Engagement score, meant to be 0 to 100"
      }
    ],
    "code": "// Example: derive a score from multiple attributes\nconst score = (input.viewCount * 0.5) + (input.purchaseCount * 2);\noutput.score = Math.round(score);",
    "fixedCode": "const views = Number.isFinite(input.viewCount) ? input.viewCount : 0;\nconst purchases = Number.isFinite(input.purchaseCount) ? input.purchaseCount : 0;\noutput.score = Math.min(100, Math.round(views * 0.5 + purchases * 2));",
    "tests": [
      {
        "id": "t1",
        "suite": "Engagement score",
        "name": "computes score from page views and purchases",
        "inputs": {
          "viewCount": "10",
          "purchaseCount": "3"
        },
        "expected": {
          "score": "11"
        }
      },
      {
        "id": "t2",
        "suite": "Engagement score",
        "name": "handles zero values",
        "inputs": {
          "viewCount": "0",
          "purchaseCount": "0"
        },
        "expected": {
          "score": "0"
        }
      },
      {
        "id": "t3",
        "suite": "Edge cases",
        "name": "handles missing attributes gracefully",
        "inputs": {},
        "expected": {
          "score": "0"
        }
      },
      {
        "id": "t4",
        "suite": "Edge cases",
        "name": "caps score at 100",
        "inputs": {
          "viewCount": "100",
          "purchaseCount": "50"
        },
        "expected": {
          "score": "100"
        }
      }
    ]
  },
  {
    "id": "12",
    "name": "Event Counts Over Several Windows",
    "description": "Counts an event over three lookback windows (for example 7, 30 and 90 days) from one timeline.",
    "replaces": "A timeline, three number attributes and five enrichments for one event over one window, all repeated for each window.",
    "source": "tealium",
    "publisher": "",
    "category": "Time and dates",
    "isBulk": false,
    "mvp": true,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "exampleInstance": "Product page views (7, 30, 90 days)",
    "params": [
      {
        "id": "p1",
        "variableName": "visitCounts",
        "direction": "input",
        "type": "Timeline",
        "exampleAttribute": "product_views_by_visit",
        "description": "One entry per past visit, { timestamp, count }. Keep it at least as long as the longest window."
      },
      {
        "id": "p2",
        "variableName": "currentVisitCount",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "product_views_this_visit",
        "description": "This visit's count so far"
      },
      {
        "id": "p3",
        "variableName": "shortWindowDays",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "7",
        "description": "Leave blank to skip"
      },
      {
        "id": "p4",
        "variableName": "midWindowDays",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "30",
        "description": "Leave blank to skip"
      },
      {
        "id": "p5",
        "variableName": "longWindowDays",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "90",
        "description": "Leave blank to skip"
      },
      {
        "id": "p6",
        "variableName": "eventTime",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "provided by framework",
        "description": "When this event happened"
      },
      {
        "id": "p7",
        "variableName": "countShort",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "product_views_7d",
        "description": "Count over the short window"
      },
      {
        "id": "p8",
        "variableName": "countMid",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "product_views_30d",
        "description": "Count over the middle window"
      },
      {
        "id": "p9",
        "variableName": "countLong",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "product_views_90d",
        "description": "Count over the long window"
      }
    ],
    "code": "const DAY = 86400000;\nconst current = Number.isFinite(input.currentVisitCount) ? input.currentVisitCount : 0;\n\nconst countSince = (days) => {\n  const cutoff = input.eventTime - days * DAY;\n  let total = current;\n  for (const entry of input.visitCounts || []) {\n    if (entry.timestamp >= cutoff && Number.isFinite(entry.count)) total += entry.count;\n  }\n  return total;\n};\n\nif (input.shortWindowDays > 0) output.countShort = countSince(input.shortWindowDays);\nif (input.midWindowDays > 0) output.countMid = countSince(input.midWindowDays);\nif (input.longWindowDays > 0) output.countLong = countSince(input.longWindowDays);",
    "tests": [
      {
        "id": "t1",
        "suite": "Windows",
        "name": "counts each window from one timeline",
        "inputs": {
          "visitCounts": "[{\"timestamp\":1794139200000,\"count\":2},{\"timestamp\":1793793600000,\"count\":3},{\"timestamp\":1792497600000,\"count\":4},{\"timestamp\":1789041600000,\"count\":5}]",
          "currentVisitCount": "1",
          "shortWindowDays": "7",
          "midWindowDays": "30",
          "longWindowDays": "90",
          "eventTime": "1794225600000"
        },
        "expected": {
          "countShort": "6",
          "countMid": "10",
          "countLong": "15"
        }
      },
      {
        "id": "t2",
        "suite": "Windows",
        "name": "includes the current visit before it reaches the timeline",
        "inputs": {
          "visitCounts": "[]",
          "currentVisitCount": "3",
          "shortWindowDays": "7",
          "midWindowDays": "30",
          "longWindowDays": "90",
          "eventTime": "1794225600000"
        },
        "expected": {
          "countShort": "3",
          "countMid": "3",
          "countLong": "3"
        }
      },
      {
        "id": "t3",
        "suite": "Windows",
        "name": "counts an entry exactly at the edge of a window",
        "inputs": {
          "visitCounts": "[{\"timestamp\":1793620800000,\"count\":2}]",
          "shortWindowDays": "7",
          "eventTime": "1794225600000"
        },
        "expected": {
          "countShort": "2"
        }
      },
      {
        "id": "t4",
        "suite": "Configuration",
        "name": "skips a window that is left blank",
        "inputs": {
          "visitCounts": "[]",
          "currentVisitCount": "1",
          "shortWindowDays": "7",
          "longWindowDays": "90",
          "eventTime": "1794225600000"
        },
        "expected": {
          "countShort": "1",
          "countLong": "1"
        }
      },
      {
        "id": "t5",
        "suite": "Edge cases",
        "name": "ignores timeline entries without a count",
        "inputs": {
          "visitCounts": "[{\"timestamp\":1794225600000},{\"timestamp\":1794225600000,\"count\":4}]",
          "shortWindowDays": "7",
          "eventTime": "1794225600000"
        },
        "expected": {
          "countShort": "4"
        }
      }
    ]
  },
  {
    "id": "13",
    "name": "Shared Device Detection",
    "description": "Flags a profile that has seen more than one customer ID, such as a family tablet, so you can keep it out of audiences.",
    "replaces": "9 attributes and a webhook that sends events back into Collect, which are billed. This extension replaces the part that flags this profile. Flagging the profiles of the other people who used the device still needs the webhook, because an extension only writes to the visitor it runs for.",
    "source": "tealium",
    "publisher": "",
    "category": "Privacy and identity",
    "isBulk": false,
    "mvp": true,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "exampleInstance": "Shared device check",
    "params": [
      {
        "id": "p1",
        "variableName": "customerId",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "customer_guid",
        "description": "The logged-in customer ID on this event"
      },
      {
        "id": "p2",
        "variableName": "seenIds",
        "direction": "input",
        "type": "Set of Strings",
        "exampleAttribute": "customer_ids_seen",
        "description": "IDs this profile has seen so far"
      },
      {
        "id": "p3",
        "variableName": "maxIds",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "1",
        "description": "How many IDs one profile may have before it's flagged"
      },
      {
        "id": "p4",
        "variableName": "seenIds",
        "direction": "output",
        "type": "Set of Strings",
        "exampleAttribute": "customer_ids_seen",
        "description": "Updated list of IDs"
      },
      {
        "id": "p5",
        "variableName": "idCount",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "customer_id_count",
        "description": "How many distinct IDs"
      },
      {
        "id": "p6",
        "variableName": "sharedDevice",
        "direction": "output",
        "type": "Badge",
        "exampleAttribute": "Shared Device",
        "description": "Assigned when idCount is above maxIds"
      }
    ],
    "code": "const seen = new Set(Array.isArray(input.seenIds) ? input.seenIds : []);\nconst id = typeof input.customerId === \"string\" ? input.customerId.trim() : \"\";\nif (id !== \"\") seen.add(id);\n\nconst limit = input.maxIds > 0 ? input.maxIds : 1;\noutput.seenIds = [...seen];\noutput.idCount = seen.size;\noutput.sharedDevice = seen.size > limit;",
    "tests": [
      {
        "id": "t1",
        "suite": "Detection",
        "name": "records the first customer ID without flagging",
        "inputs": {
          "customerId": "C-100",
          "seenIds": "[]"
        },
        "expected": {
          "seenIds": "C-100",
          "idCount": "1",
          "sharedDevice": "false"
        }
      },
      {
        "id": "t2",
        "suite": "Detection",
        "name": "doesn't count the same ID twice",
        "inputs": {
          "customerId": "C-100",
          "seenIds": "C-100"
        },
        "expected": {
          "seenIds": "C-100",
          "idCount": "1",
          "sharedDevice": "false"
        }
      },
      {
        "id": "t3",
        "suite": "Detection",
        "name": "flags a second customer ID",
        "inputs": {
          "customerId": "C-200",
          "seenIds": "C-100"
        },
        "expected": {
          "seenIds": "C-100, C-200",
          "idCount": "2",
          "sharedDevice": "true"
        }
      },
      {
        "id": "t4",
        "suite": "Configuration",
        "name": "respects a higher limit (step 1)",
        "inputs": {
          "customerId": "C-200",
          "seenIds": "C-100",
          "maxIds": "2"
        },
        "expected": {
          "seenIds": "C-100, C-200",
          "idCount": "2",
          "sharedDevice": "false"
        }
      },
      {
        "id": "t5",
        "suite": "Configuration",
        "name": "respects a higher limit (step 2)",
        "inputs": {
          "customerId": "C-300",
          "seenIds": "C-100, C-200",
          "maxIds": "2"
        },
        "expected": {
          "seenIds": "C-100, C-200, C-300",
          "idCount": "3",
          "sharedDevice": "true"
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "leaves the list alone on events without an ID",
        "inputs": {
          "customerId": "\"\"",
          "seenIds": "C-100"
        },
        "expected": {
          "seenIds": "C-100",
          "idCount": "1",
          "sharedDevice": "false"
        }
      },
      {
        "id": "t7",
        "suite": "Edge cases",
        "name": "trims spaces so the same ID matches",
        "inputs": {
          "customerId": "\" C-100 \"",
          "seenIds": "C-100"
        },
        "expected": {
          "seenIds": "C-100",
          "idCount": "1",
          "sharedDevice": "false"
        }
      }
    ]
  },
  {
    "id": "14",
    "name": "Model Score Tiers",
    "description": "Turns a score from your own model into a 0 to 100 value and a low, medium or high tier you can use in audiences.",
    "replaces": "One rule-gated Set String enrichment per tier, plus a rule for each.",
    "source": "tealium",
    "publisher": "",
    "category": "Scoring",
    "isBulk": false,
    "mvp": true,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "exampleInstance": "Churn risk tier",
    "params": [
      {
        "id": "p1",
        "variableName": "score",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "churn_model_score",
        "description": "The model's score"
      },
      {
        "id": "p2",
        "variableName": "scoreScale",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "1",
        "description": "The model's maximum score (1 or 100)"
      },
      {
        "id": "p3",
        "variableName": "mediumFrom",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "40",
        "description": "Percent where medium starts"
      },
      {
        "id": "p4",
        "variableName": "highFrom",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "70",
        "description": "Percent where high starts"
      },
      {
        "id": "p5",
        "variableName": "scorePercent",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "churn_score_percent",
        "description": "Score as 0 to 100"
      },
      {
        "id": "p6",
        "variableName": "tier",
        "direction": "output",
        "type": "String",
        "exampleAttribute": "churn_risk_tier",
        "description": "low, medium or high"
      }
    ],
    "code": "if (!Number.isFinite(input.score)) return output;\n\nconst scale = input.scoreScale > 0 ? input.scoreScale : 1;\nconst mediumFrom = Number.isFinite(input.mediumFrom) ? input.mediumFrom : 40;\nconst highFrom = Number.isFinite(input.highFrom) ? input.highFrom : 70;\nconst percent = Math.min(100, Math.max(0, (input.score / scale) * 100));\n\noutput.scorePercent = Math.round(percent);\nif (percent >= highFrom) output.tier = \"high\";\nelse if (percent >= mediumFrom) output.tier = \"medium\";\nelse output.tier = \"low\";",
    "tests": [
      {
        "id": "t1",
        "suite": "Tiers",
        "name": "puts 0.82 on a 0-1 scale in high",
        "inputs": {
          "score": "0.82",
          "scoreScale": "1",
          "mediumFrom": "40",
          "highFrom": "70"
        },
        "expected": {
          "scorePercent": "82",
          "tier": "high"
        }
      },
      {
        "id": "t2",
        "suite": "Tiers",
        "name": "works with a 0-100 scale",
        "inputs": {
          "score": "55",
          "scoreScale": "100",
          "mediumFrom": "40",
          "highFrom": "70"
        },
        "expected": {
          "scorePercent": "55",
          "tier": "medium"
        }
      },
      {
        "id": "t3",
        "suite": "Tiers",
        "name": "puts a score on a boundary in the higher tier",
        "inputs": {
          "score": "70",
          "scoreScale": "100",
          "mediumFrom": "40",
          "highFrom": "70"
        },
        "expected": {
          "scorePercent": "70",
          "tier": "high"
        }
      },
      {
        "id": "t4",
        "suite": "Edge cases",
        "name": "clamps scores outside the scale (step 1)",
        "inputs": {
          "score": "1.3",
          "scoreScale": "1"
        },
        "expected": {
          "scorePercent": "100",
          "tier": "high"
        }
      },
      {
        "id": "t5",
        "suite": "Edge cases",
        "name": "clamps scores outside the scale (step 2)",
        "inputs": {
          "score": "-0.2",
          "scoreScale": "1"
        },
        "expected": {
          "scorePercent": "0",
          "tier": "low"
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "uses 40 and 70 when thresholds aren't set",
        "inputs": {
          "score": "0.45"
        },
        "expected": {
          "scorePercent": "45",
          "tier": "medium"
        }
      },
      {
        "id": "t7",
        "suite": "Edge cases",
        "name": "leaves outputs unset without a score",
        "inputs": {
          "scoreScale": "1"
        },
        "expected": {}
      }
    ]
  },
  {
    "id": "15",
    "name": "Redact Emails and Phone Numbers",
    "description": "Replaces email addresses and phone numbers in free-text fields, such as site search, with [email] and [phone] before the event reaches the profile. It only looks for those two patterns and won't find names, addresses or other personal data.",
    "replaces": "A transformation Function.",
    "source": "tealium",
    "publisher": "",
    "category": "Privacy and identity",
    "isBulk": false,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "preEvent",
        "label": "Pre-Event"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "exampleInstance": "Clean site search terms",
    "params": [
      {
        "id": "p1",
        "variableName": "text",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "search_query",
        "description": "Free text to check"
      },
      {
        "id": "p2",
        "variableName": "text",
        "direction": "output",
        "type": "String",
        "exampleAttribute": "search_query",
        "description": "Text with matches replaced"
      },
      {
        "id": "p3",
        "variableName": "redacted",
        "direction": "output",
        "type": "Boolean",
        "exampleAttribute": "search_query_redacted",
        "description": "True when something was replaced"
      }
    ],
    "code": "if (typeof input.text !== \"string\") return output;\n\nconst emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\\.[A-Z0-9-]+)*\\.[A-Z]{2,}/gi;\nconst phonePattern = /\\+?\\(?\\d[\\d\\s().-]{8,}\\d/g;\n\nlet text = input.text.replace(emailPattern, \"[email]\");\n// Only digit runs of phone-number length count, so dates and short numbers stay\ntext = text.replace(phonePattern, (match) => {\n  const digits = match.replace(/\\D/g, \"\").length;\n  return digits >= 10 && digits <= 15 ? \"[phone]\" : match;\n});\n\noutput.text = text;\noutput.redacted = text !== input.text;",
    "tests": [
      {
        "id": "t1",
        "suite": "Emails",
        "name": "replaces an email address",
        "inputs": {
          "text": "contact jane.doe@example.co.uk please"
        },
        "expected": {
          "text": "contact [email] please",
          "redacted": "true"
        }
      },
      {
        "id": "t2",
        "suite": "Emails",
        "name": "replaces more than one",
        "inputs": {
          "text": "a@example.com or b@example.org"
        },
        "expected": {
          "text": "[email] or [email]",
          "redacted": "true"
        }
      },
      {
        "id": "t3",
        "suite": "Phone numbers",
        "name": "replaces an international number with spaces",
        "inputs": {
          "text": "call +44 20 7946 0958 today"
        },
        "expected": {
          "text": "call [phone] today",
          "redacted": "true"
        }
      },
      {
        "id": "t4",
        "suite": "Phone numbers",
        "name": "replaces a US number with brackets and a dash",
        "inputs": {
          "text": "(415) 555-0132"
        },
        "expected": {
          "text": "[phone]",
          "redacted": "true"
        }
      },
      {
        "id": "t5",
        "suite": "Leaves alone",
        "name": "keeps sizes, dates and short numbers",
        "inputs": {
          "text": "size 42 boots, order from 2026-11-09"
        },
        "expected": {
          "text": "size 42 boots, order from 2026-11-09",
          "redacted": "false"
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "leaves non-string values unchanged",
        "inputs": {},
        "expected": {}
      }
    ]
  },
  {
    "id": "16",
    "name": "Next Birthday or Anniversary",
    "description": "Works out the next occurrence of a yearly date, like a birthday or membership anniversary, and how many days away it is. The days-until value updates on each event, so an audience picks the visitor up on their next visit.",
    "replaces": "3 to 5 attributes to pull out the month and day, compare them with today and rebuild the date.",
    "source": "community",
    "publisher": "Lifecycle Lab",
    "category": "Time and dates",
    "isBulk": false,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "exampleInstance": "Next birthday",
    "params": [
      {
        "id": "p1",
        "variableName": "date",
        "direction": "input",
        "type": "Date",
        "exampleAttribute": "birth_date",
        "description": "The original date"
      },
      {
        "id": "p2",
        "variableName": "eventTime",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "provided by framework",
        "description": "When this event happened"
      },
      {
        "id": "p3",
        "variableName": "nextOccurrence",
        "direction": "output",
        "type": "Date",
        "exampleAttribute": "next_birthday",
        "description": "Next time the date comes round (UTC)"
      },
      {
        "id": "p4",
        "variableName": "daysUntil",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "days_until_birthday",
        "description": "0 on the day itself"
      }
    ],
    "code": "if (!Number.isFinite(input.date)) return output;\n\nconst DAY = 86400000;\nconst original = new Date(input.date);\nconst now = new Date(input.eventTime);\nconst today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());\nconst month = original.getUTCMonth();\nconst day = original.getUTCDate();\n\n// 29 February falls on 28 February in years without one\nconst occurrenceIn = (year) => {\n  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();\n  return Date.UTC(year, month, Math.min(day, lastDay));\n};\n\nlet next = occurrenceIn(now.getUTCFullYear());\nif (next < today) next = occurrenceIn(now.getUTCFullYear() + 1);\n\noutput.nextOccurrence = next;\noutput.daysUntil = Math.round((next - today) / DAY);",
    "tests": [
      {
        "id": "t1",
        "suite": "Next occurrence",
        "name": "finds a date later this year",
        "inputs": {
          "date": "1990-12-25T00:00:00.000Z",
          "eventTime": "1794225600000"
        },
        "expected": {
          "nextOccurrence": "2026-12-25T00:00:00.000Z",
          "daysUntil": "46"
        }
      },
      {
        "id": "t2",
        "suite": "Next occurrence",
        "name": "rolls over to next year once the date has passed",
        "inputs": {
          "date": "1985-03-14T00:00:00.000Z",
          "eventTime": "1794225600000"
        },
        "expected": {
          "nextOccurrence": "2027-03-14T00:00:00.000Z",
          "daysUntil": "125"
        }
      },
      {
        "id": "t3",
        "suite": "Next occurrence",
        "name": "counts the day itself as zero days away",
        "inputs": {
          "date": "2000-11-09T00:00:00.000Z",
          "eventTime": "1794247200000"
        },
        "expected": {
          "nextOccurrence": "2026-11-09T00:00:00.000Z",
          "daysUntil": "0"
        }
      },
      {
        "id": "t4",
        "suite": "Leap years",
        "name": "moves 29 February to 28 February in a normal year",
        "inputs": {
          "date": "1992-02-29T00:00:00.000Z",
          "eventTime": "1794225600000"
        },
        "expected": {
          "nextOccurrence": "2027-02-28T00:00:00.000Z",
          "daysUntil": "111"
        }
      },
      {
        "id": "t5",
        "suite": "Leap years",
        "name": "keeps 29 February in a leap year",
        "inputs": {
          "date": "1992-02-29T00:00:00.000Z",
          "eventTime": "1827662400000"
        },
        "expected": {
          "nextOccurrence": "2028-02-29T00:00:00.000Z",
          "daysUntil": "90"
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "leaves outputs unset without a date",
        "inputs": {
          "eventTime": "1794225600000"
        },
        "expected": {}
      }
    ]
  },
  {
    "id": "17",
    "name": "Recent Orders Summary",
    "description": "Reads recent orders, line items included, from an array-of-objects attribute and writes order count, spend, average order value and top category over a window as plain attributes.",
    "replaces": "Orders get flattened on the way in or packed into a timeline, which keeps at most 100 entries for at most 365 days.",
    "source": "tealium",
    "publisher": "",
    "category": "Commerce",
    "isBulk": false,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "exampleInstance": "Orders, last 90 days",
    "params": [
      {
        "id": "p1",
        "variableName": "recentOrders",
        "direction": "input",
        "type": "Array of Objects",
        "exampleAttribute": "recent_orders",
        "description": "{ id, placedAt, total, items: [{ sku, category, qty }] }"
      },
      {
        "id": "p2",
        "variableName": "windowDays",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "90",
        "description": "Window in days"
      },
      {
        "id": "p3",
        "variableName": "eventTime",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "provided by framework",
        "description": "When this event happened"
      },
      {
        "id": "p4",
        "variableName": "ordersInWindow",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "orders_90d",
        "description": "Orders placed in the window"
      },
      {
        "id": "p5",
        "variableName": "spendInWindow",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "spend_90d",
        "description": "Total spend in the window"
      },
      {
        "id": "p6",
        "variableName": "averageOrderValue",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "aov_90d",
        "description": "Spend divided by orders"
      },
      {
        "id": "p7",
        "variableName": "topCategory",
        "direction": "output",
        "type": "String",
        "exampleAttribute": "top_category_90d",
        "description": "Category with the most units"
      }
    ],
    "code": "const DAY = 86400000;\nconst days = input.windowDays > 0 ? input.windowDays : 90;\nconst cutoff = input.eventTime - days * DAY;\nconst orders = Array.isArray(input.recentOrders) ? input.recentOrders : [];\nconst inWindow = orders.filter((order) => Number.isFinite(order.placedAt) && order.placedAt >= cutoff);\n\nconst spend = inWindow.reduce((sum, order) => sum + (Number.isFinite(order.total) ? order.total : 0), 0);\noutput.ordersInWindow = inWindow.length;\noutput.spendInWindow = Math.round(spend * 100) / 100;\noutput.averageOrderValue = inWindow.length ? Math.round((spend / inWindow.length) * 100) / 100 : 0;\n\nconst units = {};\nfor (const order of inWindow) {\n  for (const item of order.items || []) {\n    if (!item.category) continue;\n    units[item.category] = (units[item.category] || 0) + (Number.isFinite(item.qty) ? item.qty : 1);\n  }\n}\nconst top = Object.keys(units).sort((a, b) => units[b] - units[a] || a.localeCompare(b))[0];\nif (top) output.topCategory = top;",
    "tests": [
      {
        "id": "t1",
        "suite": "Window",
        "name": "counts and sums orders inside the window",
        "inputs": {
          "recentOrders": "[{\"id\":\"A-1042\",\"placedAt\":1793361600000,\"total\":240,\"items\":[{\"sku\":\"SW-9\",\"category\":\"knitwear\",\"qty\":2},{\"sku\":\"TS-1\",\"category\":\"shirts\",\"qty\":1}]},{\"id\":\"A-0990\",\"placedAt\":1790769600000,\"total\":60.5,\"items\":[{\"sku\":\"TS-4\",\"category\":\"shirts\",\"qty\":2}]},{\"id\":\"A-0711\",\"placedAt\":1776945600000,\"total\":500,\"items\":[{\"sku\":\"CO-2\",\"category\":\"coats\",\"qty\":1}]}]",
          "windowDays": "90",
          "eventTime": "1794225600000"
        },
        "expected": {
          "ordersInWindow": "2",
          "spendInWindow": "300.5",
          "averageOrderValue": "150.25",
          "topCategory": "shirts"
        }
      },
      {
        "id": "t2",
        "suite": "Window",
        "name": "uses a shorter window when configured",
        "inputs": {
          "recentOrders": "[{\"id\":\"A-1042\",\"placedAt\":1793361600000,\"total\":240,\"items\":[{\"sku\":\"SW-9\",\"category\":\"knitwear\",\"qty\":2},{\"sku\":\"TS-1\",\"category\":\"shirts\",\"qty\":1}]},{\"id\":\"A-0990\",\"placedAt\":1790769600000,\"total\":60.5,\"items\":[{\"sku\":\"TS-4\",\"category\":\"shirts\",\"qty\":2}]}]",
          "windowDays": "30",
          "eventTime": "1794225600000"
        },
        "expected": {
          "ordersInWindow": "1",
          "spendInWindow": "240",
          "averageOrderValue": "240",
          "topCategory": "knitwear"
        }
      },
      {
        "id": "t3",
        "suite": "Line items",
        "name": "counts an item without a quantity as one unit",
        "inputs": {
          "recentOrders": "[{\"id\":\"A-1\",\"placedAt\":1794225600000,\"total\":50,\"items\":[{\"sku\":\"B-1\",\"category\":\"belts\"},{\"sku\":\"S-1\",\"category\":\"socks\",\"qty\":0}]}]",
          "windowDays": "90",
          "eventTime": "1794225600000"
        },
        "expected": {
          "ordersInWindow": "1",
          "spendInWindow": "50",
          "averageOrderValue": "50",
          "topCategory": "belts"
        }
      },
      {
        "id": "t4",
        "suite": "Edge cases",
        "name": "returns zeros and no top category without orders",
        "inputs": {
          "recentOrders": "[]",
          "windowDays": "90",
          "eventTime": "1794225600000"
        },
        "expected": {
          "ordersInWindow": "0",
          "spendInWindow": "0",
          "averageOrderValue": "0"
        }
      },
      {
        "id": "t5",
        "suite": "Edge cases",
        "name": "skips orders without a date",
        "inputs": {
          "recentOrders": "[{\"id\":\"A-2\",\"total\":99},{\"id\":\"A-3\",\"placedAt\":1794225600000,\"total\":10}]",
          "windowDays": "90",
          "eventTime": "1794225600000"
        },
        "expected": {
          "ordersInWindow": "1",
          "spendInWindow": "10",
          "averageOrderValue": "10"
        }
      }
    ]
  },
  {
    "id": "18",
    "name": "Cart Abandoner",
    "description": "Keeps a live \"has items in cart\" flag during the visit and assigns a Cart Abandoner badge when the visit ends with items in the cart and no purchase.",
    "replaces": "7 enrichments - 3 to keep the cart flag current and 4 to assign and remove the badge at visit end.",
    "source": "community",
    "publisher": "Retail Patterns Co.",
    "category": "Commerce",
    "isBulk": false,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event",
      "Visit Ended"
    ],
    "exampleInstance": "Cart abandonment",
    "params": [
      {
        "id": "p1",
        "variableName": "tealiumEvent",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "tealium_event",
        "description": "The event name"
      },
      {
        "id": "p2",
        "variableName": "cartItemCount",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "cart_item_count",
        "description": "Items in the cart, when the event carries it"
      },
      {
        "id": "p3",
        "variableName": "purchaseEvent",
        "direction": "input",
        "type": "Static String",
        "exampleAttribute": "purchase",
        "description": "The event name for a purchase"
      },
      {
        "id": "p4",
        "variableName": "itemsInCart",
        "direction": "input",
        "type": "Boolean",
        "exampleAttribute": "has_items_in_cart (visit)",
        "description": "Cart state so far this visit"
      },
      {
        "id": "p5",
        "variableName": "purchasedThisVisit",
        "direction": "input",
        "type": "Boolean",
        "exampleAttribute": "purchased_this_visit (visit)",
        "description": "Purchase state so far this visit"
      },
      {
        "id": "p6",
        "variableName": "trigger",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "provided by framework",
        "description": "Which trigger ran the extension"
      },
      {
        "id": "p7",
        "variableName": "itemsInCart",
        "direction": "output",
        "type": "Boolean",
        "exampleAttribute": "has_items_in_cart (visit)",
        "description": "Updated cart state"
      },
      {
        "id": "p8",
        "variableName": "purchasedThisVisit",
        "direction": "output",
        "type": "Boolean",
        "exampleAttribute": "purchased_this_visit (visit)",
        "description": "Updated purchase state"
      },
      {
        "id": "p9",
        "variableName": "cartAbandoner",
        "direction": "output",
        "type": "Badge",
        "exampleAttribute": "Cart Abandoner",
        "description": "Assigned at visit end, removed on purchase"
      }
    ],
    "code": "const purchaseEvent = input.purchaseEvent || \"purchase\";\nlet inCart = input.itemsInCart === true;\nlet purchased = input.purchasedThisVisit === true;\n\nif (input.trigger === \"visit-ended\") {\n  output.cartAbandoner = inCart && !purchased;\n  return output;\n}\n\nif (Number.isFinite(input.cartItemCount)) inCart = input.cartItemCount > 0;\nif (input.tealiumEvent === purchaseEvent) {\n  purchased = true;\n  inCart = false;\n  output.cartAbandoner = false;\n}\n\noutput.itemsInCart = inCart;\noutput.purchasedThisVisit = purchased;",
    "tests": [
      {
        "id": "t1",
        "suite": "Cart state",
        "name": "sets the flag when the cart has items",
        "inputs": {
          "tealiumEvent": "cart_view",
          "cartItemCount": "2",
          "trigger": "event"
        },
        "expected": {
          "itemsInCart": "true",
          "purchasedThisVisit": "false"
        }
      },
      {
        "id": "t2",
        "suite": "Cart state",
        "name": "clears the flag when the cart is emptied",
        "inputs": {
          "tealiumEvent": "cart_view",
          "cartItemCount": "0",
          "itemsInCart": "true",
          "trigger": "event"
        },
        "expected": {
          "itemsInCart": "false",
          "purchasedThisVisit": "false"
        }
      },
      {
        "id": "t3",
        "suite": "Cart state",
        "name": "keeps the flag on events without cart information",
        "inputs": {
          "tealiumEvent": "page_view",
          "itemsInCart": "true",
          "trigger": "event"
        },
        "expected": {
          "itemsInCart": "true",
          "purchasedThisVisit": "false"
        }
      },
      {
        "id": "t4",
        "suite": "Purchase",
        "name": "a purchase empties the cart and removes the badge",
        "inputs": {
          "tealiumEvent": "purchase",
          "itemsInCart": "true",
          "trigger": "event"
        },
        "expected": {
          "itemsInCart": "false",
          "purchasedThisVisit": "true",
          "cartAbandoner": "false"
        }
      },
      {
        "id": "t5",
        "suite": "Visit end",
        "name": "assigns the badge when the visit ends with items and no purchase",
        "inputs": {
          "itemsInCart": "true",
          "purchasedThisVisit": "false",
          "trigger": "visit-ended"
        },
        "expected": {
          "cartAbandoner": "true"
        }
      },
      {
        "id": "t6",
        "suite": "Visit end",
        "name": "doesn't assign it after a purchase",
        "inputs": {
          "itemsInCart": "true",
          "purchasedThisVisit": "true",
          "trigger": "visit-ended"
        },
        "expected": {
          "cartAbandoner": "false"
        }
      },
      {
        "id": "t7",
        "suite": "Visit end",
        "name": "removes it when the cart is empty",
        "inputs": {
          "itemsInCart": "false",
          "trigger": "visit-ended"
        },
        "expected": {
          "cartAbandoner": "false"
        }
      }
    ]
  },
  {
    "id": "19",
    "name": "Frequency Badge With Cooldown",
    "description": "Assigns a badge when a visitor did something at least N times in the last M days, and holds it back once they've seen the offer enough times. For example: used the loan calculator 4 or more times in 30 days, but has seen the offer fewer than 3 times in 14 days.",
    "replaces": "A timeline per window, threshold flags and intermediate badges. One bank's version of a badge like this takes 21 transformations.",
    "source": "community",
    "publisher": "Banking Journeys",
    "category": "Time and dates",
    "isBulk": false,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "exampleInstance": "Home loan offer",
    "params": [
      {
        "id": "p1",
        "variableName": "actionTimeline",
        "direction": "input",
        "type": "Timeline",
        "exampleAttribute": "loan_calculator_uses",
        "description": "One entry per use, { timestamp }"
      },
      {
        "id": "p2",
        "variableName": "exposureTimeline",
        "direction": "input",
        "type": "Timeline",
        "exampleAttribute": "loan_offer_impressions",
        "description": "One entry per time the offer was shown"
      },
      {
        "id": "p3",
        "variableName": "minActions",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "4",
        "description": "Uses needed"
      },
      {
        "id": "p4",
        "variableName": "actionWindowDays",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "30",
        "description": "Window for uses"
      },
      {
        "id": "p5",
        "variableName": "maxExposures",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "3",
        "description": "Stop once the offer has been shown this many times"
      },
      {
        "id": "p6",
        "variableName": "exposureWindowDays",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "14",
        "description": "Window for impressions"
      },
      {
        "id": "p7",
        "variableName": "eventTime",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "provided by framework",
        "description": "When this event happened"
      },
      {
        "id": "p8",
        "variableName": "qualifies",
        "direction": "output",
        "type": "Badge",
        "exampleAttribute": "Show Home Loan Offer",
        "description": "Assigned while the visitor qualifies"
      },
      {
        "id": "p9",
        "variableName": "actionsInWindow",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "loan_calculator_uses_30d",
        "description": "Uses in the window"
      },
      {
        "id": "p10",
        "variableName": "exposuresInWindow",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "loan_offer_impressions_14d",
        "description": "Impressions in the window"
      }
    ],
    "code": "const DAY = 86400000;\nconst countSince = (timeline, days) =>\n  (timeline || []).filter((entry) => entry.timestamp >= input.eventTime - days * DAY).length;\n\nconst actions = countSince(input.actionTimeline, input.actionWindowDays);\nconst exposures = countSince(input.exposureTimeline, input.exposureWindowDays);\n\noutput.actionsInWindow = actions;\noutput.exposuresInWindow = exposures;\noutput.qualifies = actions >= input.minActions && exposures < input.maxExposures;",
    "tests": [
      {
        "id": "t1",
        "suite": "Frequency",
        "name": "qualifies after 4 uses in 30 days",
        "inputs": {
          "actionTimeline": "[{\"timestamp\":1794139200000},{\"timestamp\":1793966400000},{\"timestamp\":1793534400000},{\"timestamp\":1792497600000}]",
          "exposureTimeline": "[{\"timestamp\":1794052800000}]",
          "minActions": "4",
          "actionWindowDays": "30",
          "maxExposures": "3",
          "exposureWindowDays": "14",
          "eventTime": "1794225600000"
        },
        "expected": {
          "qualifies": "true",
          "actionsInWindow": "4",
          "exposuresInWindow": "1"
        }
      },
      {
        "id": "t2",
        "suite": "Frequency",
        "name": "doesn't qualify with 3 uses",
        "inputs": {
          "actionTimeline": "[{\"timestamp\":1794139200000},{\"timestamp\":1793966400000},{\"timestamp\":1793534400000}]",
          "exposureTimeline": "[]",
          "minActions": "4",
          "actionWindowDays": "30",
          "maxExposures": "3",
          "exposureWindowDays": "14",
          "eventTime": "1794225600000"
        },
        "expected": {
          "qualifies": "false",
          "actionsInWindow": "3",
          "exposuresInWindow": "0"
        }
      },
      {
        "id": "t3",
        "suite": "Frequency",
        "name": "ignores uses older than the window",
        "inputs": {
          "actionTimeline": "[{\"timestamp\":1794139200000},{\"timestamp\":1793966400000},{\"timestamp\":1793534400000},{\"timestamp\":1791547200000}]",
          "exposureTimeline": "[]",
          "minActions": "4",
          "actionWindowDays": "30",
          "maxExposures": "3",
          "exposureWindowDays": "14",
          "eventTime": "1794225600000"
        },
        "expected": {
          "qualifies": "false",
          "actionsInWindow": "3",
          "exposuresInWindow": "0"
        }
      },
      {
        "id": "t4",
        "suite": "Cooldown",
        "name": "stops once the offer has been shown 3 times in 14 days",
        "inputs": {
          "actionTimeline": "[{\"timestamp\":1794139200000},{\"timestamp\":1794052800000},{\"timestamp\":1793966400000},{\"timestamp\":1793880000000},{\"timestamp\":1793793600000}]",
          "exposureTimeline": "[{\"timestamp\":1794139200000},{\"timestamp\":1793793600000},{\"timestamp\":1793448000000}]",
          "minActions": "4",
          "actionWindowDays": "30",
          "maxExposures": "3",
          "exposureWindowDays": "14",
          "eventTime": "1794225600000"
        },
        "expected": {
          "qualifies": "false",
          "actionsInWindow": "5",
          "exposuresInWindow": "3"
        }
      },
      {
        "id": "t5",
        "suite": "Cooldown",
        "name": "qualifies again once old impressions drop out",
        "inputs": {
          "actionTimeline": "[{\"timestamp\":1794139200000},{\"timestamp\":1794052800000},{\"timestamp\":1793966400000},{\"timestamp\":1793880000000}]",
          "exposureTimeline": "[{\"timestamp\":1794139200000},{\"timestamp\":1792843200000},{\"timestamp\":1792497600000}]",
          "minActions": "4",
          "actionWindowDays": "30",
          "maxExposures": "3",
          "exposureWindowDays": "14",
          "eventTime": "1794225600000"
        },
        "expected": {
          "qualifies": "true",
          "actionsInWindow": "4",
          "exposuresInWindow": "1"
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "doesn't qualify with empty timelines",
        "inputs": {
          "minActions": "4",
          "actionWindowDays": "30",
          "maxExposures": "3",
          "exposureWindowDays": "14",
          "eventTime": "1794225600000"
        },
        "expected": {
          "qualifies": "false",
          "actionsInWindow": "0",
          "exposuresInWindow": "0"
        }
      }
    ]
  },
  {
    "id": "20",
    "name": "Product Page Dwell Time",
    "description": "Measures how long a visitor spends on each product page during the visit, flags them as engaged once one page passes a threshold, and names the product they spent longest on.",
    "replaces": "18 attributes plus rules and date enrichments, with the 30-second threshold set in several places.",
    "source": "community",
    "publisher": "Retail Patterns Co.",
    "category": "Commerce",
    "isBulk": false,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event",
      "Visit Ended"
    ],
    "exampleInstance": "Product page dwell time",
    "params": [
      {
        "id": "p1",
        "variableName": "tealiumEvent",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "tealium_event",
        "description": "The event name"
      },
      {
        "id": "p2",
        "variableName": "productId",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "product_id",
        "description": "Product on this event"
      },
      {
        "id": "p3",
        "variableName": "productPageEvent",
        "direction": "input",
        "type": "Static String",
        "exampleAttribute": "product",
        "description": "Event name for a product page view"
      },
      {
        "id": "p4",
        "variableName": "engagedSeconds",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "30",
        "description": "Seconds on one product page that count as engaged"
      },
      {
        "id": "p5",
        "variableName": "maxSecondsPerView",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "600",
        "description": "Cap per view, so a tab left open doesn't count as reading"
      },
      {
        "id": "p6",
        "variableName": "lastProductId",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "last_product_page (visit)",
        "description": "Product page the visitor was on"
      },
      {
        "id": "p7",
        "variableName": "lastEventTime",
        "direction": "input",
        "type": "Date",
        "exampleAttribute": "last_event_time (visit)",
        "description": "When the previous event happened"
      },
      {
        "id": "p8",
        "variableName": "dwellSeconds",
        "direction": "input",
        "type": "Tally",
        "exampleAttribute": "seconds_by_product (visit)",
        "description": "Seconds per product so far"
      },
      {
        "id": "p9",
        "variableName": "eventTime",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "provided by framework",
        "description": "When this event happened"
      },
      {
        "id": "p10",
        "variableName": "trigger",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "provided by framework",
        "description": "Which trigger ran the extension"
      },
      {
        "id": "p11",
        "variableName": "lastProductId",
        "direction": "output",
        "type": "String",
        "exampleAttribute": "last_product_page (visit)",
        "description": "Updated"
      },
      {
        "id": "p12",
        "variableName": "lastEventTime",
        "direction": "output",
        "type": "Date",
        "exampleAttribute": "last_event_time (visit)",
        "description": "Updated"
      },
      {
        "id": "p13",
        "variableName": "dwellSeconds",
        "direction": "output",
        "type": "Tally",
        "exampleAttribute": "seconds_by_product (visit)",
        "description": "Updated"
      },
      {
        "id": "p14",
        "variableName": "engaged",
        "direction": "output",
        "type": "Boolean",
        "exampleAttribute": "engaged_on_product_page (visit)",
        "description": "True once any product reaches engagedSeconds"
      },
      {
        "id": "p15",
        "variableName": "topProduct",
        "direction": "output",
        "type": "String",
        "exampleAttribute": "top_product_by_time (visit)",
        "description": "Product with the most seconds"
      }
    ],
    "code": "const cap = input.maxSecondsPerView > 0 ? input.maxSecondsPerView : 600;\nconst threshold = input.engagedSeconds > 0 ? input.engagedSeconds : 30;\nconst pageEvent = input.productPageEvent || \"product\";\nconst tally = { ...(input.dwellSeconds || {}) };\n\n// Credit the time since the previous event to the product page the visitor was on\nif (input.lastProductId && Number.isFinite(input.lastEventTime)) {\n  const seconds = Math.min(cap, Math.max(0, (input.eventTime - input.lastEventTime) / 1000));\n  tally[input.lastProductId] = (tally[input.lastProductId] || 0) + Math.round(seconds);\n}\n\n// Remember where the visitor is now. At visit end there is no next page.\nconst onProductPage = input.trigger !== \"visit-ended\" && input.tealiumEvent === pageEvent && !!input.productId;\noutput.lastProductId = onProductPage ? input.productId : \"\";\noutput.lastEventTime = input.eventTime;\noutput.dwellSeconds = tally;\noutput.engaged = Object.values(tally).some((seconds) => seconds >= threshold);\n\nconst top = Object.keys(tally).sort((a, b) => tally[b] - tally[a] || a.localeCompare(b))[0];\nif (top) output.topProduct = top;",
    "tests": [
      {
        "id": "t1",
        "suite": "Dwell time",
        "name": "credits time to the product page the visitor just left",
        "inputs": {
          "tealiumEvent": "page_view",
          "productId": "\"\"",
          "lastProductId": "SW-9",
          "lastEventTime": "2026-11-09T11:59:15.000Z",
          "dwellSeconds": "{}",
          "eventTime": "1794225600000",
          "trigger": "event"
        },
        "expected": {
          "lastProductId": "\"\"",
          "lastEventTime": "2026-11-09T12:00:00.000Z",
          "dwellSeconds": "{\"SW-9\":45}",
          "engaged": "true",
          "topProduct": "SW-9"
        }
      },
      {
        "id": "t2",
        "suite": "Dwell time",
        "name": "adds to time already counted for that product",
        "inputs": {
          "tealiumEvent": "product",
          "productId": "TS-1",
          "lastProductId": "SW-9",
          "lastEventTime": "2026-11-09T11:59:45.000Z",
          "dwellSeconds": "{\"SW-9\":20}",
          "eventTime": "1794225600000",
          "trigger": "event"
        },
        "expected": {
          "lastProductId": "TS-1",
          "lastEventTime": "2026-11-09T12:00:00.000Z",
          "dwellSeconds": "{\"SW-9\":35}",
          "engaged": "true",
          "topProduct": "SW-9"
        }
      },
      {
        "id": "t3",
        "suite": "Dwell time",
        "name": "doesn't credit time spent on other pages",
        "inputs": {
          "tealiumEvent": "page_view",
          "lastProductId": "\"\"",
          "lastEventTime": "2026-11-09T11:58:30.000Z",
          "dwellSeconds": "{}",
          "eventTime": "1794225600000",
          "trigger": "event"
        },
        "expected": {
          "lastProductId": "\"\"",
          "lastEventTime": "2026-11-09T12:00:00.000Z",
          "dwellSeconds": "{}",
          "engaged": "false"
        }
      },
      {
        "id": "t4",
        "suite": "Dwell time",
        "name": "caps a single view",
        "inputs": {
          "tealiumEvent": "page_view",
          "maxSecondsPerView": "600",
          "lastProductId": "SW-9",
          "lastEventTime": "2026-11-09T10:00:00.000Z",
          "dwellSeconds": "{}",
          "eventTime": "1794225600000",
          "trigger": "event"
        },
        "expected": {
          "lastProductId": "\"\"",
          "lastEventTime": "2026-11-09T12:00:00.000Z",
          "dwellSeconds": "{\"SW-9\":600}",
          "engaged": "true",
          "topProduct": "SW-9"
        }
      },
      {
        "id": "t5",
        "suite": "Visit end",
        "name": "closes out the last product page of the visit",
        "inputs": {
          "lastProductId": "SW-9",
          "lastEventTime": "2026-11-09T11:59:35.000Z",
          "dwellSeconds": "{}",
          "eventTime": "1794225600000",
          "trigger": "visit-ended"
        },
        "expected": {
          "lastProductId": "\"\"",
          "lastEventTime": "2026-11-09T12:00:00.000Z",
          "dwellSeconds": "{\"SW-9\":25}",
          "engaged": "false",
          "topProduct": "SW-9"
        }
      },
      {
        "id": "t6",
        "suite": "Configuration",
        "name": "uses a lower engagement threshold",
        "inputs": {
          "tealiumEvent": "page_view",
          "engagedSeconds": "20",
          "lastProductId": "SW-9",
          "lastEventTime": "2026-11-09T11:59:35.000Z",
          "dwellSeconds": "{}",
          "eventTime": "1794225600000",
          "trigger": "event"
        },
        "expected": {
          "lastProductId": "\"\"",
          "lastEventTime": "2026-11-09T12:00:00.000Z",
          "dwellSeconds": "{\"SW-9\":25}",
          "engaged": "true",
          "topProduct": "SW-9"
        }
      },
      {
        "id": "t7",
        "suite": "Tracking",
        "name": "remembers the product page being viewed now",
        "inputs": {
          "tealiumEvent": "product",
          "productId": "TS-1",
          "eventTime": "1794225600000",
          "trigger": "event"
        },
        "expected": {
          "lastProductId": "TS-1",
          "lastEventTime": "2026-11-09T12:00:00.000Z",
          "dwellSeconds": "{}",
          "engaged": "false"
        }
      }
    ]
  },
  {
    "id": "21",
    "name": "Win Ratio in the Last 10 Minutes",
    "description": "Tracks spins over a short rolling window, across visits: how many, the win ratio, total stake and whether the player is on a winning or losing streak.",
    "replaces": "15 attributes with tallies used as event stores, because the shortest timeline expiry is 1 day. It only sees the current visit, and it can count spins but can't add up stakes.",
    "source": "community",
    "publisher": "Gaming Signals",
    "category": "Time and dates",
    "isBulk": false,
    "mvp": false,
    "allowedPositions": [
      {
        "id": "postVisitor",
        "label": "Post-Visitor"
      }
    ],
    "suggestedTriggers": [
      "Any Event"
    ],
    "exampleInstance": "Spin streak (10 minutes)",
    "params": [
      {
        "id": "p1",
        "variableName": "outcome",
        "direction": "input",
        "type": "String",
        "exampleAttribute": "spin_outcome",
        "description": "\"win\" or \"loss\" on spin events"
      },
      {
        "id": "p2",
        "variableName": "stake",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "stake_amount",
        "description": "Stake on this spin"
      },
      {
        "id": "p3",
        "variableName": "windowMinutes",
        "direction": "input",
        "type": "Static Number",
        "exampleAttribute": "10",
        "description": "Window in minutes"
      },
      {
        "id": "p4",
        "variableName": "spins",
        "direction": "input",
        "type": "Array of Objects",
        "exampleAttribute": "recent_spins",
        "description": "Spins kept so far, { timestamp, outcome, stake }"
      },
      {
        "id": "p5",
        "variableName": "eventTime",
        "direction": "input",
        "type": "Number",
        "exampleAttribute": "provided by framework",
        "description": "When this event happened"
      },
      {
        "id": "p6",
        "variableName": "spins",
        "direction": "output",
        "type": "Array of Objects",
        "exampleAttribute": "recent_spins",
        "description": "Spins inside the window only, so the attribute stays small"
      },
      {
        "id": "p7",
        "variableName": "recentSpins",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "spins_10m",
        "description": "Spins in the window"
      },
      {
        "id": "p8",
        "variableName": "winRatio",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "win_ratio_10m",
        "description": "Wins divided by spins, 0 to 1"
      },
      {
        "id": "p9",
        "variableName": "stakeInWindow",
        "direction": "output",
        "type": "Number",
        "exampleAttribute": "stake_10m",
        "description": "Total stake in the window"
      },
      {
        "id": "p10",
        "variableName": "streak",
        "direction": "output",
        "type": "String",
        "exampleAttribute": "streak_10m",
        "description": "winning, losing, neutral or unknown"
      }
    ],
    "code": "const minutes = input.windowMinutes > 0 ? input.windowMinutes : 10;\nconst cutoff = input.eventTime - minutes * 60000;\nconst spins = (Array.isArray(input.spins) ? input.spins : []).filter((spin) => spin.timestamp >= cutoff);\n\nif (input.outcome === \"win\" || input.outcome === \"loss\") {\n  spins.push({ timestamp: input.eventTime, outcome: input.outcome, stake: Number.isFinite(input.stake) ? input.stake : 0 });\n}\n\nconst wins = spins.filter((spin) => spin.outcome === \"win\").length;\noutput.spins = spins;\noutput.recentSpins = spins.length;\noutput.stakeInWindow = spins.reduce((sum, spin) => sum + (spin.stake || 0), 0);\n\nif (spins.length === 0) {\n  output.winRatio = 0;\n  output.streak = \"unknown\";\n} else {\n  const ratio = wins / spins.length;\n  output.winRatio = Math.round(ratio * 100) / 100;\n  output.streak = ratio >= 0.6 ? \"winning\" : ratio <= 0.4 ? \"losing\" : \"neutral\";\n}",
    "tests": [
      {
        "id": "t1",
        "suite": "Window",
        "name": "counts spins inside the window, including this one",
        "inputs": {
          "outcome": "win",
          "stake": "5",
          "windowMinutes": "10",
          "spins": "[{\"timestamp\":1794225480000,\"outcome\":\"win\",\"stake\":5},{\"timestamp\":1794225300000,\"outcome\":\"loss\",\"stake\":5},{\"timestamp\":1794225060000,\"outcome\":\"win\",\"stake\":10}]",
          "eventTime": "1794225600000"
        },
        "expected": {
          "spins": "[{\"timestamp\":1794225480000,\"outcome\":\"win\",\"stake\":5},{\"timestamp\":1794225300000,\"outcome\":\"loss\",\"stake\":5},{\"timestamp\":1794225060000,\"outcome\":\"win\",\"stake\":10},{\"timestamp\":1794225600000,\"outcome\":\"win\",\"stake\":5}]",
          "recentSpins": "4",
          "winRatio": "0.75",
          "stakeInWindow": "25",
          "streak": "winning"
        }
      },
      {
        "id": "t2",
        "suite": "Window",
        "name": "drops spins older than the window from the stored list",
        "inputs": {
          "outcome": "loss",
          "stake": "5",
          "windowMinutes": "10",
          "spins": "[{\"timestamp\":1794224940000,\"outcome\":\"win\",\"stake\":5}]",
          "eventTime": "1794225600000"
        },
        "expected": {
          "spins": "[{\"timestamp\":1794225600000,\"outcome\":\"loss\",\"stake\":5}]",
          "recentSpins": "1",
          "winRatio": "0",
          "stakeInWindow": "5",
          "streak": "losing"
        }
      },
      {
        "id": "t3",
        "suite": "Stakes",
        "name": "adds up stakes in the window",
        "inputs": {
          "outcome": "win",
          "stake": "5",
          "windowMinutes": "10",
          "spins": "[{\"timestamp\":1794225480000,\"outcome\":\"loss\",\"stake\":20}]",
          "eventTime": "1794225600000"
        },
        "expected": {
          "spins": "[{\"timestamp\":1794225480000,\"outcome\":\"loss\",\"stake\":20},{\"timestamp\":1794225600000,\"outcome\":\"win\",\"stake\":5}]",
          "recentSpins": "2",
          "winRatio": "0.5",
          "stakeInWindow": "25",
          "streak": "neutral"
        }
      },
      {
        "id": "t4",
        "suite": "Streak",
        "name": "calls a losing streak",
        "inputs": {
          "outcome": "loss",
          "stake": "5",
          "windowMinutes": "10",
          "spins": "[{\"timestamp\":1794225540000,\"outcome\":\"loss\",\"stake\":5},{\"timestamp\":1794225420000,\"outcome\":\"loss\",\"stake\":5},{\"timestamp\":1794225360000,\"outcome\":\"win\",\"stake\":5}]",
          "eventTime": "1794225600000"
        },
        "expected": {
          "spins": "[{\"timestamp\":1794225540000,\"outcome\":\"loss\",\"stake\":5},{\"timestamp\":1794225420000,\"outcome\":\"loss\",\"stake\":5},{\"timestamp\":1794225360000,\"outcome\":\"win\",\"stake\":5},{\"timestamp\":1794225600000,\"outcome\":\"loss\",\"stake\":5}]",
          "recentSpins": "4",
          "winRatio": "0.25",
          "stakeInWindow": "20",
          "streak": "losing"
        }
      },
      {
        "id": "t5",
        "suite": "Streak",
        "name": "calls an even split neutral",
        "inputs": {
          "outcome": "win",
          "stake": "5",
          "windowMinutes": "10",
          "spins": "[{\"timestamp\":1794225540000,\"outcome\":\"loss\",\"stake\":5}]",
          "eventTime": "1794225600000"
        },
        "expected": {
          "spins": "[{\"timestamp\":1794225540000,\"outcome\":\"loss\",\"stake\":5},{\"timestamp\":1794225600000,\"outcome\":\"win\",\"stake\":5}]",
          "recentSpins": "2",
          "winRatio": "0.5",
          "stakeInWindow": "10",
          "streak": "neutral"
        }
      },
      {
        "id": "t6",
        "suite": "Edge cases",
        "name": "doesn't add an entry for events that aren't spins",
        "inputs": {
          "windowMinutes": "10",
          "spins": "[]",
          "eventTime": "1794225600000"
        },
        "expected": {
          "spins": "[]",
          "recentSpins": "0",
          "winRatio": "0",
          "stakeInWindow": "0",
          "streak": "unknown"
        }
      }
    ]
  }
];

export function findExtension(id: string | undefined): ExtensionDefinition | undefined {
  return EXTENSIONS.find((e) => e.id === id);
}
