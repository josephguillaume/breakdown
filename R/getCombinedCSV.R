getCombinedCSV<-function(url){
  if(missing(url)){ 
    x=read.csv(system.file("inst/www/mar1_combined.csv",package="breakdown"),
               stringsAsFactors=FALSE,header=FALSE)
  } else {
    x=read.csv(url,stringsAsFactors=FALSE,header=FALSE)
  }
  x=as.matrix(x)
  dimnames(x)=NULL
  return(x)
}