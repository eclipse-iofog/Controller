docker run \
  --name openbao \
  --detach \
  --cap-add=IPC_LOCK \
  -p 8200:8200 \
  -v openbao-data:/home//openbao/data:rw \
  -e BAO_LOCAL_CONFIG='
ui = true

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

storage "file" {
  path = "/openbao/data"
}

disable_mlock = true
api_addr = "http://127.0.0.1:8200"
' \
  openbao/openbao server


<!-- Initial root token : s.JCqRS37hu1VOy7PX3QRVdSY2
Key 1: nTLCXY6ZtlagqRkhdjTDwpVVXK8UA8oZNGrWbfKZ4VY= -->
