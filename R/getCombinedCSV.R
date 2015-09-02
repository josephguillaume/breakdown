getCombinedCSV<-function(url){
  if(dirname(url)=="."){ 
    x=read.csv(system.file(sprintf("www/%s",url),package="breakdown",mustWork=TRUE),
               stringsAsFactors=FALSE,header=FALSE,sep=";")
  } else {
    x=read.csv(url,stringsAsFactors=FALSE,header=FALSE,sep=";")
  }
  x=as.matrix(x)
  dimnames(x)=NULL
  return(x)
}