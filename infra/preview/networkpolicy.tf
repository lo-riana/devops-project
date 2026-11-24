resource "kubernetes_network_policy" "allow_all" {
  metadata {
    name      = "allow-all"
    namespace = kubernetes_namespace.preview.metadata[0].name
  }
  spec {
    pod_selector {}
    policy_types = ["Ingress"]
    ingress {
      from {
        ip_block {
          cidr = "0.0.0.0/0"
        }
      }
    }
  }
}