getCombinedCSV<-function(url){
  if(missing(url)){ 
    x=read.csv(system.file("www/mar1_combined.csv",package="breakdown",mustWork=TRUE),
               stringsAsFactors=FALSE,header=FALSE,sep=";")
  } else {
    x=read.csv(url,stringsAsFactors=FALSE,header=FALSE,sep=";")
  }
  x=as.matrix(x)
  dimnames(x)=NULL
  return(x)
}