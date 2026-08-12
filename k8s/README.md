# LUQI AI — Kubernetes Deployment Guide

> **Version:** 29.1.0  
> **Scope:** Kubernetes production deployment for the LUQI AI platform  
> **Prerequisites:** Kubernetes 1.28+, kubectl, Helm 3.x

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Manifest Inventory](#manifest-inventory)
4. [Deployment Order](#deployment-order)
5. [Secret Setup](#secret-setup)
6. [Ingress Controller Setup](#ingress-controller-setup)
7. [cert-manager Setup for TLS](#cert-manager-setup-for-tls)
8. [HPA Configuration](#hpa-configuration)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Kubernetes Architecture Diagram

```
                              Internet
                                 |
                                 v
                    +---------------------------+
                    |  Cloud Load Balancer      |
                    |  (AWS ALB / GCP LB)       |
                    +------------+--------------+
                                 |
                                 v
                    +---------------------------+
                    |  Nginx Ingress Controller |
                    |  - TLS termination        |
                    |  - Rate limiting          |
                    |  - CORS handling          |
                    +------------+--------------+
                                 |
            +--------------------+--------------------+
            |                    |                    |
            v                    v                    v
   +----------------+  +------------------+  +------------------+
   |  Nginx (React) |  |  FastAPI App     |  |  Grafana /       |
   |  Deployment    |  |  Deployment      |  |  Prometheus      |
   +----------------+  +--------+---------+  +------------------+
                                |
           +--------------------+--------------------+
           |                    |                    |
           v                    v                    v
  +------------------+ +------------------+ +------------------+
  |  PostgreSQL      |  |  Redis           |  |  Celery          |
  |  StatefulSet     |  |  Deployment      |  |  Worker + Beat   |
  |  (Primary DB)    |  |  (Cache/Queue)   |  |  Deployments     |
  +------------------+ +------------------+ +------------------+
```

### Component Summary

| Component | Kind | Replicas | Purpose |
|-----------|------|----------|---------|
| `app` | Deployment | 3-20 (HPA) | FastAPI backend API |
| `postgres` | StatefulSet | 1 | PostgreSQL 15 primary database |
| `redis` | Deployment | 1 | Redis 7 cache, sessions, task queue |
| `celery-worker` | Deployment | 2-10 (HPA) | Background task workers |
| `celery-beat` | Deployment | 1 | Periodic task scheduler |
| `nginx` | Deployment | 2-8 (HPA) | React frontend static file server |

---

## Prerequisites

### Cluster Requirements

| Component | Minimum Version | Notes |
|-----------|----------------|-------|
| Kubernetes | 1.28+ | EKS, GKE, AKS, or self-hosted |
| Helm | 3.12+ | Package manager for Kubernetes |
| kubectl | 1.28+ | CLI for cluster management |
| Container Registry | Any | GHCR, ECR, GCR, or Docker Hub |

### Required Cluster Add-ons

| Add-on | Purpose | Installation |
|--------|---------|--------------|
| Nginx Ingress Controller | HTTP routing, TLS termination | Helm chart |
| cert-manager | Automatic TLS certificate provisioning | Helm chart |
| Metrics Server | Resource metrics for HPA | Cluster add-on |

### Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Cluster Nodes | 3 | 5+ |
| vCPU per node | 4 | 8 |
| Memory per node | 8GB | 16GB |
| Storage (PVC) | 50GB | 200GB |

---

## Manifest Inventory

The `k8s/` directory contains 17 Kubernetes manifests:

| # | File | Kind | Purpose |
|---|------|------|---------|
| 1 | `namespace.yaml` | Namespace | Application namespace |
| 2 | `configmap.yaml` | ConfigMap | Non-sensitive configuration |
| 3 | `secret.yaml` | Secret | Sensitive credentials (TEMPLATE) |
| 4 | `postgres-statefulset.yaml` | StatefulSet | PostgreSQL 15 database |
| 5 | `postgres-service.yaml` | Service | PostgreSQL headless service |
| 6 | `redis-deployment.yaml` | Deployment | Redis 7 cache/queue |
| 7 | `redis-service.yaml` | Service | Redis service endpoint |
| 8 | `app-deployment.yaml` | Deployment | FastAPI application |
| 9 | `app-service.yaml` | Service | App service endpoint |
| 10 | `celery-worker-deployment.yaml` | Deployment | Celery background workers |
| 11 | `celery-beat-deployment.yaml` | Deployment | Celery beat scheduler |
| 12 | `nginx-configmap.yaml` | ConfigMap | Nginx configuration |
| 13 | `nginx-deployment.yaml` | Deployment | Nginx static file server |
| 14 | `nginx-service.yaml` | Service | Nginx service endpoint |
| 15 | `ingress.yaml` | Ingress | HTTP routing rules |
| 16 | `hpa.yaml` | HorizontalPodAutoscaler | Auto-scaling rules |
| 17 | `pdb.yaml` | PodDisruptionBudget | Availability during disruptions |

---

## Deployment Order

Deploy manifests in the following order to respect dependency chains.

### Step 1: Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

**Expected output:**
```
namespace/luqi-ai-prod created
```

### Step 2: Configuration (ConfigMap + Secret)

```bash
# Apply ConfigMap (non-sensitive configuration)
kubectl apply -f k8s/configmap.yaml

# Apply Secret (ensure real values are set first — see Secret Setup below)
kubectl apply -f k8s/secret.yaml
```

### Step 3: Data Layer

```bash
# PostgreSQL
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/postgres-service.yaml

# Verify PostgreSQL is ready
kubectl wait --for=condition=ready pod -l component=postgres -n luqi-ai-prod --timeout=120s

# Redis
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml

# Verify Redis is ready
kubectl wait --for=condition=ready pod -l component=redis -n luqi-ai-prod --timeout=120s
```

### Step 4: Application Layer

```bash
# FastAPI application
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/app-service.yaml

# Verify app is ready
kubectl wait --for=condition=ready pod -l component=app -n luqi-ai-prod --timeout=120s
```

### Step 5: Background Workers

```bash
# Celery workers and beat scheduler
kubectl apply -f k8s/celery-worker-deployment.yaml
kubectl apply -f k8s/celery-beat-deployment.yaml
```

### Step 6: Frontend (Nginx)

```bash
# Nginx configuration and deployment
kubectl apply -f k8s/nginx-configmap.yaml
kubectl apply -f k8s/nginx-deployment.yaml
kubectl apply -f k8s/nginx-service.yaml
```

### Step 7: Routing & Scaling

```bash
# Ingress routing
kubectl apply -f k8s/ingress.yaml

# Horizontal Pod Autoscaling
kubectl apply -f k8s/hpa.yaml

# Pod Disruption Budgets
kubectl apply -f k8s/pdb.yaml
```

### Full Deployment Script

```bash
#!/bin/bash
set -e

echo "=== LUQI AI Kubernetes Deployment ==="
echo "Target namespace: luqi-ai-prod"
echo ""

# Step 1: Namespace
echo "[1/7] Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Step 2: Configuration
echo "[2/7] Applying ConfigMap and Secret..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Step 3: Data Layer
echo "[3/7] Deploying data layer (PostgreSQL + Redis)..."
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml

echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l component=postgres -n luqi-ai-prod --timeout=180s

echo "Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l component=redis -n luqi-ai-prod --timeout=180s

# Step 4: Application Layer
echo "[4/7] Deploying FastAPI application..."
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/app-service.yaml

echo "Waiting for app to be ready..."
kubectl wait --for=condition=ready pod -l component=app -n luqi-ai-prod --timeout=180s

# Step 5: Background Workers
echo "[5/7] Deploying Celery workers..."
kubectl apply -f k8s/celery-worker-deployment.yaml
kubectl apply -f k8s/celery-beat-deployment.yaml

# Step 6: Nginx
echo "[6/7] Deploying Nginx..."
kubectl apply -f k8s/nginx-configmap.yaml
kubectl apply -f k8s/nginx-deployment.yaml
kubectl apply -f k8s/nginx-service.yaml

# Step 7: Routing & Autoscaling
echo "[7/7] Configuring Ingress, HPA, and PDBs..."
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/pdb.yaml

echo ""
echo "=== Deployment Complete ==="
echo "Check status: kubectl get all -n luqi-ai-prod"
echo "App URL: https://api.luqi.ai/api/v25/health"
```

---

## Secret Setup

> **WARNING:** The `secret.yaml` file contains placeholder values. You MUST replace them with real secrets before deploying.

### Method 1: kubectl create secret (Recommended)

```bash
# Generate secure secrets
export DATABASE_URL="postgresql+asyncpg://luqi:$(openssl rand -hex 16)@postgres:5432/luqi_ai"
export JWT_SECRET=$(openssl rand -base64 48)
export REDIS_PASSWORD=$(openssl rand -hex 16)
export REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379/0"
export OPENAI_API_KEY="sk-your-key-here"
export ADMIN_PASSWORD=$(openssl rand -hex 16)

# Create secret in Kubernetes
kubectl create secret generic luqi-ai-secrets \
  --namespace=luqi-ai-prod \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=REDIS_URL="$REDIS_URL" \
  --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY" \
  --from-literal=ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  --from-literal=POSTGRES_USER="luqi" \
  --from-literal=POSTGRES_PASSWORD="$(echo $DATABASE_URL | cut -d: -f3 | cut -d@ -f1)" \
  --from-literal=POSTGRES_DB="luqi_ai" \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Method 2: Base64-Encoded YAML

```bash
# Encode each secret value
echo -n 'your-database-url' | base64
echo -n 'your-jwt-secret' | base64
echo -n 'your-redis-url' | base64
# ... repeat for all values

# Edit k8s/secret.yaml and replace placeholder base64 values
vim k8s/secret.yaml

# Apply the secret
kubectl apply -f k8s/secret.yaml
```

### Method 3: Sealed Secrets (Production Recommended)

```bash
# Install kubeseal CLI
brew install kubeseal

# Fetch the controller certificate
kubeseal --fetch-cert > pub-cert.pem

# Create and seal the secret
kubectl create secret generic luqi-ai-secrets \
  --namespace=luqi-ai-prod \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --dry-run=client -o yaml | \
  kubeseal --format=yaml --cert=pub-cert.pem > k8s/sealed-secret.yaml

# Apply the sealed secret (safe to commit to git!)
kubectl apply -f k8s/sealed-secret.yaml
```

### Method 4: External Secret Manager

For production environments, consider using:

- **AWS Secrets Manager** + External Secrets Operator
- **Google Secret Manager** + External Secrets Operator
- **HashiCorp Vault** + Vault Agent Injector
- **Azure Key Vault** + External Secrets Operator

Example with External Secrets Operator:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: luqi-ai-secrets
  namespace: luqi-ai-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secrets-manager
  target:
    name: luqi-ai-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: prod/luqi-ai
        property: database_url
    - secretKey: JWT_SECRET
      remoteRef:
        key: prod/luqi-ai
        property: jwt_secret
```

---

## Ingress Controller Setup

### Install Nginx Ingress Controller

```bash
# Add the Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install the ingress controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb"

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

### Verify Ingress Controller

```bash
# Check the ingress controller is running
kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Get the external IP/hostname
kubectl get svc ingress-nginx-controller -n ingress-nginx

# Expected output:
# NAME                       TYPE           CLUSTER-IP      EXTERNAL-IP
# ingress-nginx-controller   LoadBalancer   10.96.123.45    a1b2c3d4.elb.amazonaws.com
```

### DNS Configuration

Point your DNS A record to the Ingress Controller external IP:

```
api.luqi.ai    A    <INGRESS_EXTERNAL_IP>
```

---

## cert-manager Setup for TLS

### Install cert-manager

```bash
# Add the Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  --set installCRDs=true

# Verify installation
kubectl get pods -n cert-manager
```

### Configure Let's Encrypt ClusterIssuer

```bash
# Create the Let's Encrypt production issuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@luqi.ai
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

### Verify TLS Certificate

```bash
# Check certificate status
kubectl describe certificate -n luqi-ai-prod

# Check CertificateRequest
kubectl get certificaterequest -n luqi-ai-prod

# Check Challenge
kubectl get challenges -n luqi-ai-prod

# Verify TLS is working (after DNS is configured)
curl -v https://api.luqi.ai/api/v25/health

# Check certificate details
echo | openssl s_client -connect api.luqi.ai:443 -servername api.luqi.ai 2>/dev/null | openssl x509 -noout -text
```

### Certificate Renewal

cert-manager automatically renews certificates 30 days before expiry. To force renewal:

```bash
kubectl cert-manager renew -n luqi-ai-prod luqi-ai-tls-secret
```

---

## HPA Configuration

### Current HPA Settings

| Component | Min Replicas | Max Replicas | Target Metric | Threshold |
|-----------|-------------|-------------|---------------|-----------|
| `app` (FastAPI) | 3 | 20 | CPU / Memory | 70% / 80% |
| `celery-worker` | 2 | 10 | CPU | 70% |
| `nginx` | 2 | 8 | CPU | 70% |

### View HPA Status

```bash
# Get all HPAs
kubectl get hpa -n luqi-ai-prod

# Detailed HPA information
kubectl describe hpa app-hpa -n luqi-ai-prod

# Watch HPA in real-time
kubectl get hpa -n luqi-ai-prod -w
```

**Expected output:**
```
NAME               REFERENCE              TARGETS    MINPODS   MAXPODS   REPLICAS   AGE
app-hpa            Deployment/app         45%/70%    3         20        3          10m
celery-worker-hpa  Deployment/celery-worker  30%/70%  2         10        2          10m
nginx-hpa          Deployment/nginx       25%/70%    2         8         2          10m
```

### Manual Scaling (for testing)

```bash
# Scale app deployment manually
kubectl scale deployment app --replicas=5 -n luqi-ai-prod

# Scale back to HPA-controlled count
kubectl scale deployment app --replicas=3 -n luqi-ai-prod
```

### Advanced: KEDA for Queue-Based Scaling

For Celery workers, CPU-based scaling may not be optimal. Consider KEDA for queue-length-based scaling:

```yaml
# Install KEDA
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace

# ScaledObject for Celery workers
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: celery-worker-keda
  namespace: luqi-ai-prod
spec:
  scaleTargetRef:
    name: celery-worker
  pollingInterval: 15
  cooldownPeriod: 300
  minReplicaCount: 2
  maxReplicaCount: 10
  triggers:
    - type: redis
      metadata:
        address: redis.luqi-ai-prod.svc.cluster.local:6379
        listName: celery
        listLength: "5"
```

---

## Monitoring

### Prometheus Service Discovery

Prometheus automatically discovers Kubernetes targets via service annotations. The app exposes metrics on port `9090`:

```yaml
# In app-deployment.yaml
ports:
  - name: http
    containerPort: 8080
  - name: metrics
    containerPort: 9090
```

### Grafana Datasource

Configure Grafana to use the in-cluster Prometheus:

```yaml
# monitoring/grafana-datasource.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus.monitoring.svc.cluster.local:9090
    isDefault: true
```

### Import Dashboard

```bash
# Port-forward to Grafana
kubectl port-forward svc/grafana 3000:3000 -n luqi-ai-prod

# Import dashboard via API
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @../monitoring/grafana-dashboard.json
```

---

## Troubleshooting

### General Diagnostics

```bash
# Check all resources in the namespace
kubectl get all -n luqi-ai-prod

# Check pod status
kubectl get pods -n luqi-ai-prod -o wide

# Check events (errors, warnings)
kubectl get events -n luqi-ai-prod --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n luqi-ai-prod
kubectl top nodes
```

### Pod Not Starting

```bash
# Check pod details
kubectl describe pod <pod-name> -n luqi-ai-prod

# Common issues:
# - ImagePullBackOff: Check image name and registry credentials
# - CrashLoopBackOff: Check application logs
# - Pending: Check resource quotas and node capacity
```

### Application Logs

```bash
# View app logs
kubectl logs -f deployment/app -n luqi-ai-prod

# View previous container logs (after restart)
kubectl logs -f deployment/app -n luqi-ai-prod --previous

# View logs from a specific pod
kubectl logs -f <pod-name> -n luqi-ai-prod

# View Celery worker logs
kubectl logs -f deployment/celery-worker -n luqi-ai-prod

# View Celery beat logs
kubectl logs -f deployment/celery-beat -n luqi-ai-prod
```

### Database Connectivity

```bash
# Port-forward to PostgreSQL
kubectl port-forward svc/postgres 5432:5432 -n luqi-ai-prod

# Connect with psql
psql -h localhost -U luqi -d luqi_ai

# Check PostgreSQL logs
kubectl logs -f statefulset/postgres -n luqi-ai-prod
```

### Redis Connectivity

```bash
# Port-forward to Redis
kubectl port-forward svc/redis 6379:6379 -n luqi-ai-prod

# Test connection
redis-cli -h localhost -p 6379 PING

# Check Redis logs
kubectl logs -f deployment/redis -n luqi-ai-prod
```

### Ingress Issues

```bash
# Check ingress status
kubectl get ingress -n luqi-ai-prod

# Check ingress details
kubectl describe ingress luqi-ai-ingress -n luqi-ai-prod

# Check ingress controller logs
kubectl logs -f deployment/ingress-nginx-controller -n ingress-nginx

# Test internal connectivity
kubectl run debug --rm -it --image=curlimages/curl --restart=Never \
  -- curl http://app.luqi-ai-prod.svc.cluster.local:8080/api/v25/health
```

### HPA Not Scaling

```bash
# Check HPA status
kubectl describe hpa app-hpa -n luqi-ai-prod

# Common issues:
# - Metrics Server not installed
# - Resource requests not set in deployment
# - Current usage below threshold

# Verify Metrics Server is working
kubectl top pods -n luqi-ai-prod
```

### Certificate Issues

```bash
# Check certificate status
kubectl describe certificate -n luqi-ai-prod

# Check cert-manager logs
kubectl logs -f deployment/cert-manager -n cert-manager

# Check CertificateRequest status
kubectl get certificaterequest -n luqi-ai-prod

# Delete and recreate certificate (forces re-issuance)
kubectl delete secret luqi-ai-tls-secret -n luqi-ai-prod
kubectl cert-manager renew -n luqi-ai-prod luqi-ai-tls-secret
```

### Rollback Deployment

```bash
# Check rollout history
kubectl rollout history deployment/app -n luqi-ai-prod

# Rollback to previous version
kubectl rollout undo deployment/app -n luqi-ai-prod

# Rollback to specific revision
kubectl rollout undo deployment/app -n luqi-ai-prod --to-revision=2

# Monitor rollback
kubectl rollout status deployment/app -n luqi-ai-prod
```

### Debug Pod

```bash
# Launch a debug pod in the namespace
kubectl run debug --rm -it --image=busybox:1.36 --restart=Never -n luqi-ai-prod -- /bin/sh

# From inside the debug pod:
# Test DNS resolution
nslookup postgres.luqi-ai-prod.svc.cluster.local
nslookup redis.luqi-ai-prod.svc.cluster.local

# Test network connectivity
nc -zv postgres 5432
nc -zv redis 6379
nc -zv app 8080
```

### Full Reset (Data Loss Warning)

> **WARNING:** This deletes all data including PostgreSQL PVCs. Use only in development.

```bash
# Delete all resources
kubectl delete -f k8s/

# Delete persistent volume claims (removes database data)
kubectl delete pvc -l app=luqi-ai -n luqi-ai-prod

# Delete the namespace
kubectl delete namespace luqi-ai-prod
```

---

## Useful Commands Reference

```bash
# === Status & Debugging ===
kubectl get all -n luqi-ai-prod                    # All resources
kubectl get pods -n luqi-ai-prod -o wide           # Pods with node info
kubectl get events -n luqi-ai-prod --sort-by='.lastTimestamp'  # Events
kubectl top pods -n luqi-ai-prod                   # Resource usage

# === Logs ===
kubectl logs -f deployment/app -n luqi-ai-prod     # App logs
kubectl logs -f deployment/celery-worker -n luqi-ai-prod  # Worker logs
kubectl logs -f statefulset/postgres -n luqi-ai-prod      # DB logs

# === Scaling ===
kubectl scale deployment app --replicas=5 -n luqi-ai-prod
kubectl get hpa -n luqi-ai-prod -w

# === Rollout ===
kubectl rollout status deployment/app -n luqi-ai-prod
kubectl rollout history deployment/app -n luqi-ai-prod
kubectl rollout undo deployment/app -n luqi-ai-prod

# === Port Forwarding ===
kubectl port-forward svc/app 8080:8080 -n luqi-ai-prod
kubectl port-forward svc/postgres 5432:5432 -n luqi-ai-prod
kubectl port-forward svc/redis 6379:6379 -n luqi-ai-prod

# === Exec into pods ===
kubectl exec -it deployment/app -n luqi-ai-prod -- /bin/sh
kubectl exec -it statefulset/postgres -n luqi-ai-prod -- psql -U luqi
```

---

*Document Version: 29.1.0*  
*For the full platform documentation, see [PRODUCTION_SCALING.md](../PRODUCTION_SCALING.md)*
