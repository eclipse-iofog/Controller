## v1.3.0
* Features
  * Allow creation of microservice without catalog item
  * Embedded ECN-Viewer
  * Support both K8S and non-K8S ECNs
  * Return miroservice status as part of `GET /microservice/{id}` request
* Bug fixes
  * K8S SSH bug, send nodes' external IP address to kubelet
  * Requests were failing when request body has additional properties
