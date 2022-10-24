terraform {
  required_providers {
    elasticsearch = {
      source = "phillbaker/elasticsearch"
      version = "2.0.2"
    }
  }
}

# Create app alert monitor elasticsearch_opensearch_monitor
resource "elasticsearch_opensearch_monitor" "app_monitor" {
  body = <<EOF
{
    "type": "monitor",
    "name": "${var.app_monitor.name}",
    "monitor_type": "query_level_monitor",
    "enabled": true,
    "schedule": {
        "period": {
            "interval": ${var.app_monitor.interval},
            "unit": "MINUTES"
        }
    },
    "inputs": [
        {
         "search": {
            "indices": [
               "${var.app_monitor.index}"
            ],
            "query": {
               ${var.app_monitor.queryblock}
            }
         }
      }
    ],
    "triggers": [
        {
          "query_level_trigger": {
            "id": "${var.app_monitor.query_level_trigger_id}",
            "name": "Alert from monitor ${var.app_monitor.name}",
            "severity": "${var.app_monitor.severity}",
            "condition": {
                "script": {
                    "source": "${var.app_monitor.trigger_source}",
                    "lang": "painless"
                }
            },
            "actions": [
                {
                    "id": "${var.app_monitor.automation_queue_action_id}",
                    "name": "Notify Email Alert",
                    "destination_id": "${var.automation_destination_id}",
                    "message_template": {
                        "source": "Monitor {{ctx.monitor.name}} just entered alert status. Please investigate the issue.\n  - Trigger: {{ctx.trigger.name}}\n  - Severity: {{ctx.trigger.severity}}\n  - Period start: {{ctx.periodStart}}\n  - Period end: {{ctx.periodEnd}}",
                        "lang" : "mustache"
                    },
                    "throttle_enabled": true,
                    "throttle": {
                        "value": ${var.app_monitor.throttle},
                        "unit": "MINUTES"
                    },
                    "subject_template": {
                        "source": "Email Alert {{ctx.monitor.name}} ",
                        "lang" : "mustache"
                    }
                }
            ]
        }
        }
    ]
}
EOF
}