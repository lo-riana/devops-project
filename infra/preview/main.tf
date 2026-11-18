terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }
  backend "local" {}
}

variable "pr_number" { type = string }
variable "image" { type = string }

variable "owner" {
  type    = string
  default = "loriana"
}

variable "expires" {
  type    = string
  default = "2026-11-25"
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "kind-devops-lab"
}

resource "kubernetes_namespace" "preview" {
  metadata {
    name = "pr-${var.pr_number}"
    labels = {
      purpose = "preview"
      pr      = var.pr_number
      owner   = var.owner
      expires = var.expires
    }
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "myapp"
    namespace = kubernetes_namespace.preview.metadata[0].name
  }
  spec {
    replicas = 1
    selector {
      match_labels = { app = "myapp" }
    }
    template {
      metadata {
        labels = { app = "myapp" }
      }
      spec {
        container {
          name  = "myapp"
          image = var.image
          port {
            container_port = 3000
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "app" {
  metadata {
    name      = "myapp"
    namespace = kubernetes_namespace.preview.metadata[0].name
  }
  spec {
    selector = { app = "myapp" }
    port {
      port        = 80
      target_port = 3000
    }
  }
}

output "namespace" {
  value = kubernetes_namespace.preview.metadata[0].name
}